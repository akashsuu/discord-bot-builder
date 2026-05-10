'use strict';

const { EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'boostcount').trim() || 'boostcount';
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

function boostTierLabel(tier) {
  return ['No Level', 'Level 1', 'Level 2', 'Level 3'][Number(tier) || 0] || 'No Level';
}

function varsFor(message, guild) {
  const boostCount = guild.premiumSubscriptionCount ?? 0;
  const boostTier = guild.premiumTier ?? 0;
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: guild.name || 'Server',
    serverId: guild.id || '',
    boostCount: String(boostCount),
    boosts: String(boostCount),
    boostTier: String(boostTier),
    boostTierLabel: boostTierLabel(boostTier),
    channel: message.channel?.name || '',
  };
}

module.exports = {
  meta: {
    name: 'Boost Count',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows the current server boost count with editable embed/plain text output.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_boostcount: {
      label: 'Boost Count',
      icon: 'BC',
      color: '#F472B6',
      description: 'Prefix command that shows the server boost count. Supports aliases like bc and boosts.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'boostcount', required: true },
        aliases: { type: 'string', default: 'bc,boosts', required: false },
        titleTemplate: { type: 'string', default: '{server} Boost Count', required: false },
        descriptionTemplate: { type: 'string', default: '{server} currently has **{boostCount}** boosts.\nBoost tier: **{boostTierLabel}**', required: false },
        plainTextTemplate: { type: 'string', default: '{server} has {boostCount} boosts ({boostTierLabel}).', required: false },
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

        let guild = message.guild;
        try { guild = await message.guild.fetch(); }
        catch { guild = message.guild; }

        const vars = varsFor(message, guild);
        const title = applyTemplate(data.titleTemplate || '{server} Boost Count', vars);
        const description = applyTemplate(
          data.descriptionTemplate || '{server} currently has **{boostCount}** boosts.\nBoost tier: **{boostTierLabel}**',
          vars
        );

        if (data.embedEnabled === false) {
          const text = applyTemplate(data.plainTextTemplate || '{server} has {boostCount} boosts ({boostTierLabel}).', vars);
          await message.channel.send(text);
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#F472B6'))
          .setTitle(title)
          .setDescription(description);

        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || 'Boost Count', vars), iconURL: data.logoUrl || undefined });
        }
        if (data.imageUrl) embed.setImage(data.imageUrl);
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'boostcount').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Boost Count command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    const _boosts = message.guild.premiumSubscriptionCount ?? 0;
    const _tier = ["No Level", "Level 1", "Level 2", "Level 3"][message.guild.premiumTier ?? 0] || "No Level";
    message.channel.send(\`\${message.guild.name} has \${_boosts} boosts (\${_tier}).\`);
  }
}`;
      },
    },
  },
};
