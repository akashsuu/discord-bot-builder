'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_unban: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'unban').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('❌ You do not have **Ban Members** permission.');
          return false;
        }

        const args   = message.content.slice(cmd.length).trim().split(/\s+/);
        const userId = args[0];
        if (!userId || !/^\d{17,20}$/.test(userId)) {
          await message.reply(`❌ Usage: \`${cmd} <userID> [reason]\``);
          return false;
        }

        const reason = args.slice(1).join(' ') || node.data.reason || 'No reason provided';

        try {
          await message.guild.members.unban(userId, reason);
          await message.channel.send(`🔓 User **${userId}** has been unbanned.\n📋 Reason: ${reason}`);
        } catch (err) {
          await message.reply('❌ Failed to unban that user. Are they actually banned?');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'unban').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Unban ─────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("BanMembers")) {
    message.reply("❌ You do not have Ban Members permission.");
  } else {
    const _args = message.content.slice("${cmd}".length).trim().split(/\\s+/);
    const _uid  = _args[0];
    if (!_uid) { message.reply("❌ Usage: \`${cmd} <userID> [reason]\`"); }
    else {
      const _r = _args.slice(1).join(" ") || "${reason}";
      message.guild.members.unban(_uid, _r).then(() =>
        message.channel.send(\`🔓 User **\${_uid}** has been unbanned.\\n📋 Reason: \${_r}\`)
      ).catch(() => message.reply("❌ Failed to unban that user."));
    }
  }
}`;
      },
    },
  },
};
