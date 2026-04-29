'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    lock_permission: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // Get role (default: everyone)
        const roleId = node.data.roleId || guild.roles.everyone.id;
        const role = guild.roles.cache.get(roleId);

        if (!role) {
          await message.reply("❌ Role not found.");
          return false;
        }

        try {
          await channel.permissionOverwrites.edit(role, {
            SendMessages: false
          });

          // Save context
          if (ctx) {
            ctx.lockedChannel = channel;
          }

          const text = (node.data.message || "Channel locked")
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to lock channel.");
          return false;
        }
      },

      generateCode(node) {
        const msg = (node.data.message || "Channel locked")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Lock Channel ─────────────────────────
const channel = message.channel;
const role = message.guild.roles.everyone;

channel.permissionOverwrites.edit(role, {
  SendMessages: false
}).then(() => {
  message.channel.send(
    \`${msg}\`.replace(/\\{channel\\}/g, channel.name)
  );
}).catch(() => {
  message.reply("❌ Failed to lock channel.");
});
`;
      }
    }
  }
};