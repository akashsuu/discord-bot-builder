'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_lock: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'lock').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('❌ You do not have **Manage Channels** permission.');
          return false;
        }

        const everyoneRole = message.guild.roles.everyone;

        try {
          await message.channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
          });
          await message.channel.send('🔒 This channel has been **locked**. Members cannot send messages.');
        } catch (err) {
          await message.reply('❌ Failed to lock this channel.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'lock').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Lock ──────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageChannels")) {
    message.reply("❌ You do not have Manage Channels permission.");
  } else {
    message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false })
      .then(() => message.channel.send("🔒 Channel locked."))
      .catch(() => message.reply("❌ Failed to lock channel."));
  }
}`;
      },
    },
  },
};
