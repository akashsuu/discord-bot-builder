'use strict';

const { PermissionFlagsBits } = require('discord.js');

// ── Template engine ───────────────────────────────────────────────────────────
// Replaces every {token} in a string with a value from the vars map.
// Unknown tokens are left as-is so users see what is missing.
function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

// Build the full variable map for output templates
function buildVars(message, target, reason, cmd) {
  const now = new Date();
  return {
    // Sender
    user:          message.author?.username  || 'Unknown',
    tag:           message.author?.tag       || 'Unknown#0000',
    id:            message.author?.id        || '0',
    mention:       `<@${message.author?.id  || '0'}>`,
    // Target (kicked member)
    target:        target.user?.tag          || target.user?.username || 'Unknown',
    targetName:    target.user?.username     || 'Unknown',
    targetId:      target.user?.id           || '0',
    targetMention: `<@${target.user?.id     || '0'}>`,
    // Context
    reason,
    command:       cmd,
    server:        message.guild?.name       || 'Unknown',
    channel:       message.channel?.name     || 'Unknown',
    memberCount:   String((message.guild?.memberCount ?? 1) - 1), // after kick
    // Time
    date:          now.toISOString().slice(0, 10),
    time:          now.toTimeString().slice(0, 8),
  };
}

module.exports = {
  meta: {
    name:          'Kick',
    version:       '2.0.0',
    author:        'Akashsuu',
    description:   'Kicks a mentioned member with full template output and optional DM.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    mod_kick: {
      label:       'Kick',
      icon:        '👢',
      color:       '#4A1E2A',
      description: 'Kicks a mentioned user. Supports {user}, {target}, {targetId}, {targetMention}, {reason}, {server}, {channel}, {date}, {time}, {memberCount}.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:    { type: 'string',  default: 'kick',               required: true  },
        reason:     { type: 'string',  default: 'No reason provided', required: false },
        output:     { type: 'string',  default: '👢 **{target}** has been kicked by **{user}**.\n📋 Reason: {reason}', required: false },
        dmEnabled:  { type: 'boolean', default: false,                required: false, description: 'DM the kicked user before kicking' },
        dmMessage:  { type: 'string',  default: 'You have been kicked from **{server}**.\n📋 Reason: {reason}', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author.bot) return false;
        if (!message.guild) return false;

        // ── 1. Command match ───────────────────────────────────────────────
        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'kick').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        // ── 2. Bot permission check ────────────────────────────────────────
        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
          await message.reply('❌ I do not have **Kick Members** permission.').catch(() => {});
          return false;
        }

        // ── 3. Author permission check ─────────────────────────────────────
        if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
          await message.reply('❌ You do not have **Kick Members** permission.').catch(() => {});
          return false;
        }

        // ── 4. Resolve target ─────────────────────────────────────────────
        const target = ctx?.flow?.targetMember || message.mentions.members?.first() || null;
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``).catch(() => {});
          return false;
        }

        // ── 5. Self / bot guard ────────────────────────────────────────────
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot kick yourself.').catch(() => {});
          return false;
        }
        if (target.id === message.client.user.id) {
          await message.reply('❌ I cannot kick myself.').catch(() => {});
          return false;
        }

        // ── 6. Kickable check ──────────────────────────────────────────────
        if (!target.kickable) {
          await message.reply('❌ I cannot kick that user — their role may be higher than mine.').catch(() => {});
          return false;
        }

        // ── 7. Resolve reason ─────────────────────────────────────────────
        const afterCmd = message.content.slice(cmd.length).trim();
        const reason   = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
          || ctx?.flow?.reason
          || node.data?.reason
          || 'No reason provided';

        // ── 8. Build template vars ─────────────────────────────────────────
        const vars = buildVars(message, target, reason, cmd);

        // ── 9. Optional DM to kicked user ──────────────────────────────────
        if (node.data?.dmEnabled) {
          const dmTpl = node.data?.dmMessage || 'You have been kicked from **{server}**.\n📋 Reason: {reason}';
          try {
            await target.send(applyTemplate(dmTpl, vars));
          } catch { /* DMs may be closed — non-fatal */ }
        }

        // ── 10. Execute kick ───────────────────────────────────────────────
        try {
          await target.kick(reason);
        } catch (err) {
          await message.reply(`❌ Failed to kick: ${err.message}`).catch(() => {});
          return false;
        }

        // ── 11. Template output ────────────────────────────────────────────
        const outputTpl = node.data?.output
          || '👢 **{target}** has been kicked by **{user}**.\n📋 Reason: {reason}';
        const text = applyTemplate(outputTpl, vars);

        try {
          if (ctx?.sendEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          await message.channel.send(text).catch(() => {});
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'kick').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || '👢 **{target}** has been kicked by **{user}**.\n📋 Reason: {reason}')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const dmEnabled = !!node.data?.dmEnabled;
        const dmMsg  = (node.data?.dmMessage || 'You have been kicked from **{server}**.\n📋 Reason: {reason}')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Kick ──────────────────────────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.guild.members.me?.permissions.has("KickMembers")) {
    message.reply("❌ I do not have Kick Members permission.");
  } else if (!message.member?.permissions.has("KickMembers")) {
    message.reply("❌ You do not have Kick Members permission.");
  } else {
    const _kt = message.mentions.members?.first();
    if (!_kt) {
      message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`);
    } else if (!_kt.kickable) {
      message.reply("❌ I cannot kick that user.");
    } else {
      const _kr = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim() || "${reason}";
      const _now = new Date();
      const _kv = {
        user: message.author?.username, tag: message.author?.tag, id: message.author?.id,
        mention: \`<@\${message.author?.id}>\`,
        target: _kt.user?.tag, targetName: _kt.user?.username, targetId: _kt.user?.id,
        targetMention: \`<@\${_kt.user?.id}>\`,
        reason: _kr, command: "${cmd}",
        server: message.guild?.name, channel: message.channel?.name,
        memberCount: String((message.guild?.memberCount ?? 1) - 1),
        date: _now.toISOString().slice(0,10), time: _now.toTimeString().slice(0,8),
      };
      const _kt_apply = (t) => t.replace(/\\{(\\w+)\\}/g, (m, k) => _kv[k] ?? m);
      ${dmEnabled ? `try { await _kt.send(_kt_apply(\`${dmMsg}\`)); } catch {}` : ''}
      _kt.kick(_kr).then(() => {
        message.channel.send(_kt_apply(\`${output}\`));
      }).catch((e) => message.reply(\`❌ Failed: \${e.message}\`));
    }
  }
}`;
      },
    },
  },
};
