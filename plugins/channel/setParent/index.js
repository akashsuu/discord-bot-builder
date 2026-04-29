'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_parent: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // 🔹 Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // 🔹 Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // 🔹 Get parent category
        const parentId = node.data.parentId;
        const parent = guild.channels.cache.get(parentId);

        if (!parent || parent.type !== 4) {
          await message.reply("❌ Invalid category.");
          return false;
        }

        const lockPermissions = node.data.lockPermissions === true || node.data.lockPermissions === "true";

        try {
          await channel.setParent(parent, { lockPermissions });

          if (ctx) {
            ctx.updatedChannel = channel;
          }

          let text = node.data.message || "Channel moved";

          text = text.replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to set parent.");
          return false;
        }
      },

      generateCode(node) {
        const msg = (node.data.message || "Channel moved")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Parent ─────────────────────────
const channel = message.channel;
const parent = message.guild.channels.cache.get("${node.data.parentId}");

if (parent) {
  channel.setParent(parent)
    .then(() => {
      message.channel.send(
        \`${msg}\`.replace(/\\{channel\\}/g, channel.name)
      );
    })
    .catch(() => {
      message.reply("❌ Failed to set parent.");
    });
}
`;
      }
    }
  }
};