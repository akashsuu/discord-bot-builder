'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_slowmode: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'slowmode').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('❌ You do not have **Manage Channels** permission.');
          return false;
        }

        const args    = message.content.slice(cmd.length).trim().split(/\s+/);
        const seconds = parseInt(args[0], 10);

        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
          await message.reply(`❌ Usage: \`${cmd} <0-21600>\` (seconds)`);
          return false;
        }

        try {
          await message.channel.setRateLimitPerUser(seconds);
          if (seconds === 0) {
            await message.channel.send('🐇 Slowmode has been **disabled** for this channel.');
          } else {
            await message.channel.send(`🐢 Slowmode set to **${seconds} second(s)** in this channel.`);
          }
        } catch (err) {
          await message.reply('❌ Failed to set slowmode.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'slowmode').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Slowmode ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageChannels")) {
    message.reply("❌ You do not have Manage Channels permission.");
  } else {
    const _s = parseInt(message.content.slice("${cmd}".length).trim(), 10);
    if (isNaN(_s) || _s < 0 || _s > 21600) { message.reply("❌ Usage: \`${cmd} <0-21600>\`"); }
    else {
      message.channel.setRateLimitPerUser(_s).then(() =>
        message.channel.send(_s === 0 ? "🐇 Slowmode disabled." : \`🐢 Slowmode set to **\${_s}s**.\`)
      );
    }
  }
}`;
      },
    },
  },
};
