'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_kick: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'kick').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
          await message.reply('❌ You do not have **Kick Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot kick yourself.');
          return false;
        }
        if (target.id === message.client.user.id) {
          await message.reply('❌ I cannot kick myself.');
          return false;
        }
        if (!target.kickable) {
          await message.reply('❌ I cannot kick that user (role too high?).');
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim() || node.data.reason || 'No reason provided';

        try {
          await target.kick(reason);
          await message.channel.send(`👢 **${target.user.tag}** has been kicked.\n📋 Reason: ${reason}`);
        } catch (err) {
          await message.reply('❌ Failed to kick that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'kick').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Kick ──────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("KickMembers")) {
    message.reply("❌ You do not have Kick Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`); }
    else if (!_t.kickable) { message.reply("❌ I cannot kick that user."); }
    else {
      const _r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").trim() || "${reason}";
      _t.kick(_r).then(() => message.channel.send(\`👢 **\${_t.user.tag}** has been kicked.\\n📋 Reason: \${_r}\`));
    }
  }
}`;
      },
    },
  },
};
