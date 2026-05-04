'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_softban: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'softban').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('❌ You do not have **Ban Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot soft-ban yourself.');
          return false;
        }
        if (!target.bannable) {
          await message.reply('❌ I cannot ban that user (role too high?).');
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim() || node.data.reason || 'No reason provided';

        try {
          await target.ban({ deleteMessageSeconds: 7 * 24 * 60 * 60, reason });
          await message.guild.members.unban(target.id, 'Soft ban — auto-unban');
          await message.channel.send(`🧹 **${target.user.tag}** has been soft-banned (messages deleted, immediately unbanned).\n📋 Reason: ${reason}`);
        } catch (err) {
          await message.reply('❌ Failed to soft-ban that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'softban').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Soft Ban ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("BanMembers")) {
    message.reply("❌ You do not have Ban Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`); }
    else if (!_t.bannable) { message.reply("❌ I cannot ban that user."); }
    else {
      const _r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim() || "${reason}";
      _t.ban({ deleteMessageSeconds: 604800, reason: _r }).then(() =>
        message.guild.members.unban(_t.id, "Soft ban auto-unban").then(() =>
          message.channel.send(\`🧹 **\${_t.user.tag}** soft-banned.\\n📋 Reason: \${_r}\`)
        )
      );
    }
  }
}`;
      },
    },
  },
};
