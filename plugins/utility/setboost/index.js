'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const boostSettings = new Map();

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'setboost').trim() || 'setboost';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function matchesCommand(content, command) {
  const text = String(content || '').trim();
  const cmd = String(command || '').trim();
  if (!text || !cmd) return false;
  if (!text.toLowerCase().startsWith(cmd.toLowerCase())) return false;
  const rest = text.slice(cmd.length);
  return !rest || /^\s/.test(rest);
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#F472B6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xF472B6 : parsed;
}

function defaultsFrom(data, message) {
  return {
    enabled: data.enabledByDefault !== false,
    channelId: String(data.boostChannelId || '').replace(/[<#>]/g, ''),
    updatedBy: message.author?.id || '',
  };
}

function getSettings(data, message) {
  const key = message.guild.id;
  if (!boostSettings.has(key)) boostSettings.set(key, defaultsFrom(data, message));
  return boostSettings.get(key);
}

function varsFor(message, settings) {
  const channel = settings.channelId
    ? (message.guild.channels.cache.get(settings.channelId) || message.channel)
    : message.channel;
  return {
    user: message.author?.username || 'Unknown',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    member: message.member?.displayName || message.author?.username || 'Booster',
    memberMention: message.author?.id ? `<@${message.author.id}>` : '@booster',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: channel?.name ? `#${channel.name}` : '#boosts',
    channelId: channel?.id || '',
    boostCount: String(message.guild?.premiumSubscriptionCount ?? 1),
    boostTier: String(message.guild?.premiumTier ?? 0),
    status: settings.enabled ? 'ON' : 'OFF',
  };
}

function buildPanelEmbed(data, message, settings) {
  const vars = varsFor(message, settings);
  const title = applyTemplate(data.panelTitle || 'Boost Message Settings', vars);
  const description = applyTemplate(data.panelDescription || 'Configure boost announcements for {server}.', vars);
  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#F472B6'))
    .setTitle(title)
    .setDescription(`${description}\n\nStatus: **${vars.status}**\nChannel: ${vars.channel}`);

  if (data.logoName || data.logoUrl) {
    embed.setAuthor({ name: applyTemplate(data.logoName || 'Boost Settings', vars), iconURL: data.logoUrl || undefined });
  }
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });
  return embed;
}

function buildRows(data, settings, nonce) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setboost:toggle:${nonce}`)
        .setLabel(settings.enabled ? (data.enableButtonLabel || 'Boost Messages: ON') : (data.disableButtonLabel || 'Boost Messages: OFF'))
        .setStyle(settings.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setboost:test:${nonce}`)
        .setLabel(data.testButtonLabel || 'Send Test')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`setboost:reset:${nonce}`)
        .setLabel(data.resetButtonLabel || 'Reset')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function sendBoostTest(data, message, settings) {
  const vars = varsFor(message, settings);
  const text = applyTemplate(data.boostMessage || 'Thank you {memberMention} for boosting {server}!', vars);
  const channel = settings.channelId
    ? (message.guild.channels.cache.get(settings.channelId) || message.channel)
    : message.channel;
  if (data.embedEnabled === false) {
    await channel.send(text);
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#F472B6'))
    .setTitle(applyTemplate(data.embedTitle || 'Boost Settings', vars))
    .setDescription(text);
  if (data.logoName || data.logoUrl) {
    embed.setAuthor({ name: applyTemplate(data.logoName || 'Boost', vars), iconURL: data.logoUrl || undefined });
  }
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });
  await channel.send({ embeds: [embed] });
}

async function replyInteraction(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
    else await interaction.reply({ content, ephemeral: true });
  } catch {
    // Button replies are best-effort; the panel update already shows the state.
  }
}

module.exports = {
  meta: {
    name: 'Set Boost',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Configure boost message settings with interactive buttons.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_setboost: {
      label: 'Set Boost',
      icon: 'BST',
      color: '#F472B6',
      description: 'Posts an interactive boost settings panel with toggle, test, and reset buttons.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'setboost', required: true },
        boostChannelId: { type: 'string', default: '', required: false },
        panelTitle: { type: 'string', default: 'Boost Message Settings', required: false },
        panelDescription: { type: 'string', default: 'Configure boost announcements for {server}.', required: false },
        boostMessage: { type: 'string', default: 'Thank you {memberMention} for boosting {server}! We now have {boostCount} boosts.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const command = commandWithPrefix(data.command, ctx?.prefix || '!');
        if (!matchesCommand(message.content, command)) return false;

        const settings = getSettings(data, message);
        const nonce = `${message.id || Date.now()}`;
        const panel = await message.channel.send({
          embeds: data.embedEnabled === false ? [] : [buildPanelEmbed(data, message, settings)],
          content: data.embedEnabled === false ? applyTemplate(data.panelDescription || 'Configure boost announcements for {server}.', varsFor(message, settings)) : undefined,
          components: buildRows(data, settings, nonce),
        });

        const collector = panel.createMessageComponentCollector?.({ time: 10 * 60 * 1000 });
        collector?.on('collect', async (interaction) => {
          if (interaction.user?.id !== message.author.id) {
            await replyInteraction(interaction, 'Only the command user can edit this boost setup panel.');
            return;
          }

          const [, action, incomingNonce] = String(interaction.customId || '').split(':');
          if (incomingNonce !== nonce) return;

          if (action === 'toggle') {
            settings.enabled = !settings.enabled;
            settings.updatedBy = interaction.user.id;
            await interaction.update({
              embeds: data.embedEnabled === false ? [] : [buildPanelEmbed(data, message, settings)],
              content: data.embedEnabled === false ? applyTemplate(data.panelDescription || 'Configure boost announcements for {server}.', varsFor(message, settings)) : undefined,
              components: buildRows(data, settings, nonce),
            });
            return;
          }

          if (action === 'test') {
            await sendBoostTest(data, message, settings);
            await replyInteraction(interaction, applyTemplate(data.testMessage || 'Test boost message sent to {channel}.', varsFor(message, settings)));
            return;
          }

          if (action === 'reset') {
            const fresh = defaultsFrom(data, message);
            settings.enabled = fresh.enabled;
            settings.channelId = fresh.channelId;
            settings.updatedBy = fresh.updatedBy;
            await interaction.update({
              embeds: data.embedEnabled === false ? [] : [buildPanelEmbed(data, message, settings)],
              content: data.embedEnabled === false ? applyTemplate(data.panelDescription || 'Configure boost announcements for {server}.', varsFor(message, settings)) : undefined,
              components: buildRows(data, settings, nonce),
            });
          }
        });

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'setboost').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Set Boost command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    message.channel.send("Boost setup panel: configure this node in the builder for buttons and embeds.");
  }
}`;
      },
    },
  },
};
