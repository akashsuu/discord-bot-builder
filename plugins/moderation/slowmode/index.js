'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function resolveTargetChannel(message, token) {
  if (!token) return message.channel;
  const id = String(token).replace(/[<#>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return message.channel;
  return message.guild.channels.cache.get(id) || null;
}

function buildVars(message, channel, seconds) {
  return {
    mention: `<@${message.author?.id || '0'}>`,
    user: message.author?.username || 'Unknown',
    channelMention: channel ? `<#${channel.id}>` : '#unknown',
    seconds: String(seconds)
  };
}

module.exports = {
  meta: {
    name: 'Slowmode',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Sets channel slowmode.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_slowmode: {
      label: 'Slowmode',
      icon: 'SM',
      color: '#B91C1C',
      description: 'Prefix command to set slowmode. Usage: slowmode [seconds] or slowmode #channel [seconds]',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'slowmode', required: true },
        defaultSeconds: { type: 'number', default: 10, min: 0, max: 21600, required: false },
        output: {
          type: 'string',
          default: '{mention} set slowmode in {channelMention} to **{seconds}s**.',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'slowmode').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('I need Manage Channels permission.').catch(() => { });
          return false;
        }
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('You need Manage Channels permission.').catch(() => { });
          return false;
        }

        const parts = message.content.slice(cmd.length).trim().split(/\s+/).filter(Boolean);
        const channelToken = parts[0] && (/^<#?\d{17,20}>?$/.test(parts[0]) || /^\d{17,20}$/.test(parts[0])) ? parts[0] : null;
        const secondsToken = channelToken ? parts[1] : parts[0];

        const targetChannel = resolveTargetChannel(message, channelToken);
        if (!targetChannel) {
          await message.reply(`Usage: \`${cmd} [seconds]\` or \`${cmd} #channel [seconds]\``).catch(() => { });
          return false;
        }
        if (!targetChannel.isTextBased() || targetChannel.type === ChannelType.DM || !('setRateLimitPerUser' in targetChannel)) {
          await message.reply('Please choose a text channel that supports slowmode.').catch(() => { });
          return false;
        }

        const fallback = Math.min(Math.max(Number(node.data?.defaultSeconds ?? 10), 0), 21600);
        const parsed = /^\d+$/.test(secondsToken || '') ? Number(secondsToken) : fallback;
        const seconds = Math.min(Math.max(parsed, 0), 21600);

        try {
          await targetChannel.setRateLimitPerUser(seconds, `Slowmode set by ${message.author.tag}`);
        } catch (err) {
          await message.reply(`Failed to set slowmode: ${err.message}`).catch(() => { });
          return false;
        }

        const text = applyTemplate(
          node.data?.output || '{mention} set slowmode in {channelMention} to **{seconds}s**.',
          buildVars(message, targetChannel, seconds)
        );

        try {
          if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => { });
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'slowmode').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const fallback = Math.min(Math.max(Number(node.data?.defaultSeconds ?? 10), 0), 21600);
        const output = (node.data?.output || '{mention} set slowmode in {channelMention} to **{seconds}s**.')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Slowmode
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _sm_parts = message.content.slice("${cmd}".length).trim().split(/\\s+/).filter(Boolean);
  const _sm_chanTok = _sm_parts[0] && (/^<#?\\d{17,20}>?$/.test(_sm_parts[0]) || /^\\d{17,20}$/.test(_sm_parts[0])) ? _sm_parts[0] : null;
  const _sm_secsTok = _sm_chanTok ? _sm_parts[1] : _sm_parts[0];
  const _sm_id = String(_sm_chanTok || "").replace(/[<#>]/g, "");
  const _sm_channel = /^\\d{17,20}$/.test(_sm_id) ? (message.guild.channels.cache.get(_sm_id) || message.channel) : message.channel;
  const _sm_raw = /^\\d+$/.test(_sm_secsTok || "") ? Number(_sm_secsTok) : ${fallback};
  const _sm_secs = Math.min(Math.max(_sm_raw, 0), 21600);
  _sm_channel.setRateLimitPerUser(_sm_secs, \`Slowmode set by \${message.author.tag}\`).then(() => {
    const _sm_vars = { mention: \`<@\${message.author?.id}>\`, channelMention: \`<#\${_sm_channel.id}>\`, seconds: String(_sm_secs) };
    const _sm_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _sm_vars[k] ?? m);
    message.channel.send(_sm_apply(\`${output}\`)).catch(() => {});
  }).catch((e) => message.reply(\`Failed to set slowmode: \${e.message}\`).catch(() => {}));
}
`;
      },
    },
  },
};
