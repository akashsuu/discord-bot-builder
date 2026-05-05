'use strict';

const { PermissionFlagsBits } = require('discord.js');

// Template substitution — same token set across the whole flow system
function applyTemplate(template, vars) {
  return String(template || '').replace(
    /\{(\w+)\}/g,
    (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`)
  );
}

module.exports = {
  meta: {
    name:          'Flow Kick',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Kick action that reads the target from ctx.flow (set by Flow Command). Template output supports {user}, {target}, {reason}, {command}.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    flow_kick: {
      label:       'Kick Action',
      icon:        '👢',
      color:       '#4A1E2A',
      description: 'Executes a kick against ctx.flow.targetMember. Must follow a Flow Command node.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        reason:       { type: 'string', default: 'No reason provided',                                             required: false },
        output:       { type: 'string', default: '👢 **{target}** has been kicked by **{user}**.\n📋 Reason: {reason}', required: false },
        usageMessage: { type: 'string', default: '❌ Usage: `{command} @user [reason]`',                           required: false },
        errorMessage: { type: 'string', default: '❌ I cannot kick that user (role too high?).',                   required: false },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild) return false;

        // ── 1. Bot permission check ─────────────────────────────────────────
        const botMember = message.guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.KickMembers)) {
          try { await message.reply('❌ I do not have **Kick Members** permission.'); } catch {}
          return false;
        }

        // ── 2. Resolve target ───────────────────────────────────────────────
        // Priority: ctx.flow.targetMember (set by Flow Command) → inline mention
        const target = ctx.flow?.targetMember
          || message.mentions.members?.first()
          || null;

        const cmd = ctx.flow?.command
          || (ctx.prefix || '') + (node.data?.command || 'kick');

        if (!target) {
          const usageTpl = node.data?.usageMessage || '❌ Usage: `{command} @user [reason]`';
          const usageMsg = applyTemplate(usageTpl, { command: cmd });
          try {
            if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, usageMsg);
            else               await message.reply(usageMsg);
          } catch { await message.reply(usageMsg).catch(() => {}); }
          return false;
        }

        // ── 3. Self / bot guard ──────────────────────────────────────────────
        if (target.id === message.author.id) {
          try { await message.reply('❌ You cannot kick yourself.'); } catch {}
          return false;
        }
        if (target.id === message.client.user.id) {
          try { await message.reply('❌ I cannot kick myself.'); } catch {}
          return false;
        }

        // ── 4. Kickable check ────────────────────────────────────────────────
        if (!target.kickable) {
          const errMsg = node.data?.errorMessage || '❌ I cannot kick that user (role too high?).';
          try {
            if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, errMsg);
            else               await message.reply(errMsg);
          } catch { await message.reply(errMsg).catch(() => {}); }
          return false;
        }

        // ── 5. Resolve reason ────────────────────────────────────────────────
        const reason = ctx.flow?.reason
          || (ctx.args || []).filter((a) => !/<@!?\d+>/.test(a)).join(' ').trim()
          || node.data?.reason
          || 'No reason provided';

        // ── 6. Execute kick ──────────────────────────────────────────────────
        try {
          await target.kick(reason);
        } catch (err) {
          try { await message.reply(`❌ Failed to kick: ${err.message}`); } catch {}
          return false;
        }

        // ── 7. Template output ───────────────────────────────────────────────
        const template = node.data?.output
          || '👢 **{target}** has been kicked by **{user}**.\n📋 Reason: {reason}';

        const text = applyTemplate(template, {
          user:    message.author?.username  || 'Unknown',
          tag:     message.author?.tag       || 'Unknown#0000',
          target:  target.user?.tag          || target.user?.username || 'Unknown',
          reason,
          command: cmd,
          server:  message.guild?.name       || 'Unknown',
          channel: message.channel?.name     || 'Unknown',
        });

        try {
          if (ctx.sendEmbed) {
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
        const reason  = (node.data?.reason  || 'No reason provided').replace(/"/g, '\\"');
        const output  = (node.data?.output  || '👢 **{target}** kicked.\n📋 Reason: {reason}')
                          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Kick Action ──────────────────────────────────────────────────────
if (!message.guild.members.me?.permissions.has("KickMembers")) {
  message.reply("❌ I do not have Kick Members permission."); return;
}
const _kickTarget = _target || message.mentions.members?.first();
if (!_kickTarget) { message.reply("❌ Specify a user to kick."); return; }
if (!_kickTarget.kickable) { message.reply("❌ I cannot kick that user."); return; }
const _kickReason = _reason || "${reason}";
_kickTarget.kick(_kickReason).then(() => {
  const _kickMsg = \`${output}\`
    .replace(/\\{user\\}/g,    message.author?.username || "Unknown")
    .replace(/\\{target\\}/g,  _kickTarget.user?.tag   || "Unknown")
    .replace(/\\{reason\\}/g,  _kickReason)
    .replace(/\\{command\\}/g, _cmd || "kick");
  message.channel.send(_kickMsg);
}).catch((e) => message.reply(\`❌ Failed: \${e.message}\`));`;
      },
    },
  },
};
