'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const activeGiveaways = globalThis.__kiodiumActiveGiveaways || new Map();
globalThis.__kiodiumActiveGiveaways = activeGiveaways;

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'giveaway').trim() || 'giveaway';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const cmd = String(command || '').trim();
    if (!cmd) continue;
    if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
    const rest = text.slice(cmd.length);
    if (!rest || /^\s/.test(rest)) return true;
  }
  return false;
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#B45309').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xB45309 : parsed;
}

function parseDuration(input) {
  const raw = String(input || '1d').trim().toLowerCase();
  const match = raw.match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)$/);
  if (!match) return { label: '1 day', ms: 24 * 60 * 60 * 1000, raw: '1d' };
  const amount = Math.max(1, Number(match[1]) || 1);
  const unit = match[2][0];
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  const labelUnit = unit === 's' ? 'second' : unit === 'm' ? 'minute' : unit === 'h' ? 'hour' : 'day';
  return { label: `${amount} ${labelUnit}${amount === 1 ? '' : 's'}`, ms: amount * mult, raw };
}

function relativeEnd(duration) {
  if (duration.raw === '1d') return 'in a day';
  if (duration.raw === '1h') return 'in an hour';
  return `in ${duration.label}`;
}

function formatTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function buildGiveawayEmbed(data, state, host, giveawayId, ended = false, winners = '') {
  const duration = parseDuration(state.duration);
  const endAt = state.endAt || Date.now() + duration.ms;
  const vars = {
    ...state,
    ...data,
    giveawayId,
    emoji: data.enterEmoji || '🎉',
    count: state.participants?.size || 0,
    duration: duration.label,
    endTime: ended ? 'Ended' : `<t:${Math.floor(endAt / 1000)}:f>`,
    relativeEnd: ended ? 'ended' : relativeEnd(duration),
    host,
    winners,
    winnerCount: state.winnerCount || data.winnerCount || 1,
  };

  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor))
    .setTitle(ended ? (data.endedTitle || '🎉 GIVEAWAY ENDED 🎉') : (data.panelTitle || '🎉 GIVEAWAY 🎉'))
    .setDescription(
      ended
        ? formatTemplate(data.endedDescription || '**{prize}**\nWinner(s): {winners}', vars)
        : `**${state.prize || data.prize || 'Example Prize'}**\n\nClick ${data.enterEmoji || '🎉'} to enter!\n**Duration:** ${duration.label} (Ends ${vars.relativeEnd})\n${formatTemplate(data.hostedByTemplate || 'Hosted by: {host}', vars)}`
    );

  if (!ended) {
    embed.setFooter({
      text: formatTemplate(data.footerTemplate || '{winnerCount} winner • ID: {giveawayId} • Ends • {endTime}', vars),
    });
  }
  return embed;
}

function giveawayButton(data, count, disabled = false) {
  return new ButtonBuilder()
    .setCustomId('giveaway:disabled')
    .setLabel(formatTemplate(data.enterButtonLabel || '{emoji} {count}', {
      emoji: data.enterEmoji || '🎉',
      count,
    }).slice(0, 80))
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);
}

function giveawayRows(data, giveawayId, count, disabled = false) {
  const btn = giveawayButton(data, count, disabled).setCustomId(disabled ? 'giveaway:ended' : `giveaway:enter:${giveawayId}`);
  return [new ActionRowBuilder().addComponents(btn)];
}

function setupRows(data, nonce) {
  const durations = String(data.durationButtons || '1h,6h,1d,3d,7d').split(',').map((d) => d.trim()).filter(Boolean).slice(0, 5);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_setup:prize:${nonce}`).setLabel('Prize').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`giveaway_setup:winners:${nonce}`).setLabel('Winners').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`giveaway_setup:duration:${nonce}`).setLabel('Custom Duration').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`giveaway_setup:send:${nonce}`).setLabel('Send Giveaway').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`giveaway_setup:abort:${nonce}`).setLabel('Abort').setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      ...durations.map((duration) => new ButtonBuilder()
        .setCustomId(`giveaway_setup:preset:${duration}:${nonce}`)
        .setLabel(duration)
        .setStyle(ButtonStyle.Secondary))
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`giveaway_setup:channel:${nonce}`)
        .setPlaceholder('Select giveaway channel')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    ),
  ];
}

function setupEmbed(data, state, host) {
  const duration = parseDuration(state.duration);
  return new EmbedBuilder()
    .setColor(hexToInt(data.embedColor))
    .setTitle(data.panelTitle || '🎉 GIVEAWAY 🎉')
    .setDescription(`${data.setupMessage || 'Configure your giveaway, then send it.'}\n\n**Prize:** ${state.prize}\n**Duration:** ${duration.label}\n**Winners:** ${state.winnerCount}\n**Channel:** ${state.channelId ? `<#${state.channelId}>` : 'Current channel'}\n**Enter button:** ${data.enterEmoji || '🎉'}`)
    .setFooter({ text: `Admin: ${host}` });
}

async function showModal(interaction, nonce, field, title, label, value, style = TextInputStyle.Short) {
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(label)
    .setStyle(style)
    .setRequired(true)
    .setValue(String(value || '').slice(0, 4000));
  const modal = new ModalBuilder()
    .setCustomId(`giveaway_setup_modal:${field}:${nonce}`)
    .setTitle(title)
    .addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function endGiveaway(giveawayId) {
  const record = activeGiveaways.get(giveawayId);
  if (!record) return;
  activeGiveaways.delete(giveawayId);
  const entries = [...record.participants];
  const winnerCount = Math.max(1, Number(record.state.winnerCount || 1));
  const shuffled = entries.sort(() => Math.random() - 0.5).slice(0, winnerCount);
  const winners = shuffled.length ? shuffled.map((id) => `<@${id}>`).join(', ') : (record.data.noEntriesText || 'No valid entries.');
  const embed = buildGiveawayEmbed(record.data, record.state, record.hostMention, giveawayId, true, winners);
  await record.message.edit({
    embeds: [embed],
    components: giveawayRows(record.data, giveawayId, record.participants.size, true),
  }).catch(() => {});
  if (shuffled.length) {
    await record.message.channel.send(`🎉 Congratulations ${winners}! You won **${record.state.prize}**.`).catch(() => {});
  }
}

globalThis.__kiodiumEndGiveaway = endGiveaway;

module.exports = {
  meta: {
    name: 'Giveaway Create',
    version: '1.0.0',
    author: 'Kiodium',
    description: 'Create giveaways from Discord with an admin setup panel.',
    engineVersion: '>=1.0.0',
  },

  onLoad(safeAPI) {
    if (!safeAPI?.client || this._attached) return;
    this._attached = true;
    safeAPI.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton?.() || !String(interaction.customId || '').startsWith('giveaway:enter:')) return;
      const giveawayId = interaction.customId.split(':')[2];
      const record = activeGiveaways.get(giveawayId);
      if (!record) {
        await interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true }).catch(() => {});
        return;
      }
      if (record.participants.has(interaction.user.id)) {
        record.participants.delete(interaction.user.id);
        await interaction.reply({ content: 'You left the giveaway.', ephemeral: true }).catch(() => {});
      } else {
        record.participants.add(interaction.user.id);
        await interaction.reply({ content: 'You entered the giveaway.', ephemeral: true }).catch(() => {});
      }
      record.state.participants = record.participants;
      await record.message.edit({
        embeds: [buildGiveawayEmbed(record.data, record.state, record.hostMention, giveawayId)],
        components: giveawayRows(record.data, giveawayId, record.participants.size),
      }).catch(() => {});
    });
  },

  nodes: {
    giveaway_create: {
      label: 'Giveaway Create',
      icon: 'GIVE',
      color: '#B45309',
      description: 'Admin command to create giveaways with buttons and a channel picker.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'giveaway', required: true },
        aliases: { type: 'string', default: 'gcreate,gw' },
        embedEnabled: { type: 'boolean', default: true },
        embedColor: { type: 'string', default: '#B45309' },
        panelTitle: { type: 'string', default: '🎉 GIVEAWAY 🎉' },
        setupMessage: { type: 'string', default: 'Configure your giveaway, then send it to the selected channel.' },
        prize: { type: 'string', default: 'Example Prize' },
        duration: { type: 'string', default: '1d' },
        winnerCount: { type: 'number', default: 1 },
        channelId: { type: 'string', default: '' },
        enterEmoji: { type: 'string', default: '🎉' },
        enterButtonLabel: { type: 'string', default: '{emoji} {count}' },
        durationButtons: { type: 'string', default: '1h,6h,1d,3d,7d' },
        winnerLabel: { type: 'string', default: '{winnerCount} winner' },
        footerTemplate: { type: 'string', default: '{winnerCount} winner • ID: {giveawayId} • Ends • {endTime}' },
        hostedByTemplate: { type: 'string', default: 'Hosted by: {host}' },
        endedTitle: { type: 'string', default: '🎉 GIVEAWAY ENDED 🎉' },
        endedDescription: { type: 'string', default: '**{prize}**\nWinner(s): {winners}' },
        noEntriesText: { type: 'string', default: 'No valid entries.' },
        permissionMessage: { type: 'string', default: 'You need Manage Server permission to create giveaways.' },
        sentMessage: { type: 'string', default: 'Giveaway sent to {channel}.' },
        abortedMessage: { type: 'string', default: 'Giveaway setup cancelled.' },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        if (!matchCommand(message.content, commands)) return false;

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply(data.permissionMessage || 'You need Manage Server permission to create giveaways.').catch(() => {});
          return true;
        }

        const nonce = `${message.id || Date.now()}`;
        const state = {
          prize: data.prize || 'Example Prize',
          duration: data.duration || '1d',
          winnerCount: Math.max(1, Number(data.winnerCount || 1)),
          channelId: data.channelId || message.channel.id,
          participants: new Set(),
        };

        const setup = await message.channel.send({
          embeds: [setupEmbed(data, state, message.author.tag || message.author.username)],
          components: setupRows(data, nonce),
        });

        const collector = setup.createMessageComponentCollector?.({ time: 15 * 60 * 1000 });
        collector?.on('collect', async (interaction) => {
          if (interaction.user.id !== message.author.id) {
            await interaction.reply({ content: 'Only the giveaway creator can use this setup panel.', ephemeral: true }).catch(() => {});
            return;
          }

          const parts = String(interaction.customId || '').split(':');
          if (parts[0] !== 'giveaway_setup') return;
          const action = parts[1];
          const incomingNonce = parts[parts.length - 1];
          if (incomingNonce !== nonce) return;

          if (action === 'channel' && interaction.isChannelSelectMenu?.()) {
            state.channelId = interaction.values[0] || state.channelId;
            await interaction.update({ embeds: [setupEmbed(data, state, message.author.tag || message.author.username)], components: setupRows(data, nonce) });
            return;
          }

          if (action === 'preset') {
            state.duration = parts[2] || state.duration;
            await interaction.update({ embeds: [setupEmbed(data, state, message.author.tag || message.author.username)], components: setupRows(data, nonce) });
            return;
          }

          if (action === 'abort') {
            collector.stop('aborted');
            await interaction.update({ content: data.abortedMessage || 'Giveaway setup cancelled.', embeds: [], components: [] });
            return;
          }

          if (action === 'send') {
            const channel = message.guild.channels.cache.get(state.channelId) || message.channel;
            if (!channel?.send) {
              await interaction.reply({ content: 'I cannot send to that channel.', ephemeral: true }).catch(() => {});
              return;
            }
            const duration = parseDuration(state.duration);
            state.endAt = Date.now() + duration.ms;
            const giveawayId = `${Date.now()}`;
            const giveawayMessage = await channel.send({
              embeds: [buildGiveawayEmbed(data, state, `<@${message.author.id}>`, giveawayId)],
              components: giveawayRows(data, giveawayId, 0),
            });
            activeGiveaways.set(giveawayId, {
              data,
              state,
              participants: state.participants,
              message: giveawayMessage,
              guildId: message.guild.id,
              channelId: channel.id,
              hostMention: `<@${message.author.id}>`,
            });
            setTimeout(() => endGiveaway(giveawayId), duration.ms);
            collector.stop('sent');
            await interaction.update({
              content: formatTemplate(data.sentMessage || 'Giveaway sent to {channel}.', { channel: `<#${channel.id}>` }),
              embeds: [],
              components: [],
            });
            return;
          }

          const modalMap = {
            prize: ['Giveaway Prize', 'Prize', state.prize, TextInputStyle.Short],
            winners: ['Winner Count', 'Number of winners', String(state.winnerCount), TextInputStyle.Short],
            duration: ['Giveaway Duration', 'Example: 1h, 1d, 7d', state.duration, TextInputStyle.Short],
          };
          if (!modalMap[action]) return;
          const [title, label, value, style] = modalMap[action];
          await showModal(interaction, nonce, action, title, label, value, style);
          try {
            const submitted = await interaction.awaitModalSubmit({
              time: 2 * 60 * 1000,
              filter: (i) => i.user.id === message.author.id && i.customId === `giveaway_setup_modal:${action}:${nonce}`,
            });
            const nextValue = submitted.fields.getTextInputValue('value');
            if (action === 'winners') state.winnerCount = Math.max(1, Number(nextValue) || 1);
            else state[action] = nextValue || state[action];
            await submitted.update({ embeds: [setupEmbed(data, state, message.author.tag || message.author.username)], components: setupRows(data, nonce) });
          } catch {}
        });

        collector?.on('end', async (_, reason) => {
          if (reason === 'sent' || reason === 'aborted') return;
          await setup.edit({ components: [] }).catch(() => {});
        });

        await message.delete().catch(() => {});
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'giveaway').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Giveaway Create command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  message.channel.send("Giveaway Create runs through the Kiodium plugin runtime for setup buttons, channel select, and entries.");
}`;
      },
    },
  },
};
