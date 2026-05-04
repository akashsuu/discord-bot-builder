'use strict';
const { PermissionFlagsBits } = require('discord.js');

// guild+user → [{ reason, date }]
const warnings = new Map();

module.exports = {
  nodes: {
    mod_warn: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'warn').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await message.reply('❌ You do not have **Moderate Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot warn yourself.');
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim() || node.data.reason || 'No reason provided';

        const key    = `${message.guild.id}:${target.id}`;
        const list   = warnings.get(key) || [];
        list.push({ reason, date: new Date().toISOString(), moderator: message.author.tag });
        warnings.set(key, list);

        await message.channel.send(
          `⚠️ **${target.user.tag}** has been warned. (Warning #${list.length})\n📋 Reason: ${reason}`
        );
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'warn').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Warn ──────────────────────────────────────
// Requires a module-level: const warnings = new Map();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ModerateMembers")) {
    message.reply("❌ You do not have Moderate Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`); }
    else {
      const _r   = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim() || "${reason}";
      const _key = \`\${message.guild.id}:\${_t.id}\`;
      const _lst = warnings.get(_key) || [];
      _lst.push({ reason: _r, date: new Date().toISOString() });
      warnings.set(_key, _lst);
      message.channel.send(\`⚠️ **\${_t.user.tag}** warned. (Warning #\${_lst.length})\\n📋 Reason: \${_r}\`);
    }
  }
}`;
      },
    },
  },
};
