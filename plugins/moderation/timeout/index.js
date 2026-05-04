'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_timeout: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'timeout').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await message.reply('❌ You do not have **Moderate Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [minutes] [reason]\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot timeout yourself.');
          return false;
        }
        if (!target.moderatable) {
          await message.reply('❌ I cannot timeout that user (role too high?).');
          return false;
        }

        const after    = message.content.slice(cmd.length).trim();
        const stripped = after.replace(/<@!?\d+>/g, '').trim();
        const parts    = stripped.split(/\s+/);
        const durMins  = parseInt(parts[0], 10) || node.data.duration || 10;
        const reason   = parts.slice(isNaN(parseInt(parts[0], 10)) ? 0 : 1).join(' ') || node.data.reason || 'No reason provided';

        try {
          await target.timeout(durMins * 60 * 1000, reason);
          await message.channel.send(`⏱️ **${target.user.tag}** has been timed out for **${durMins} minute(s)**.\n📋 Reason: ${reason}`);
        } catch (err) {
          await message.reply('❌ Failed to timeout that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd  = (node.data.command || 'timeout').replace(/"/g, '\\"');
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const durMins = node.data.duration || 10;
        const reason  = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Timeout ───────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ModerateMembers")) {
    message.reply("❌ You do not have Moderate Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [minutes] [reason]\\\`\`); }
    else if (!_t.moderatable) { message.reply("❌ I cannot timeout that user."); }
    else {
      const _stripped = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim();
      const _parts = _stripped.split(/\\s+/);
      const _dur = parseInt(_parts[0], 10) || ${durMins};
      const _r   = _parts.slice(isNaN(parseInt(_parts[0],10)) ? 0 : 1).join(" ") || "${reason}";
      _t.timeout(_dur * 60000, _r).then(() =>
        message.channel.send(\`⏱️ **\${_t.user.tag}** timed out for **\${_dur} min(s)**.\\n📋 Reason: \${_r}\`)
      );
    }
  }
}`;
      },
    },
  },
};
