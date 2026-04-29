'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_position: {

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

        let position = parseInt(node.data.position);
        if (isNaN(position)) position = 0;

        const relative = node.data.relative === true || node.data.relative === "true";

        try {
          let newPosition;

          if (relative) {
            newPosition = channel.position + position;
          } else {
            newPosition = position;
          }

          await channel.setPosition(newPosition);

          if (ctx) {
            ctx.updatedChannel = channel;
          }

          let text = node.data.message || "Position updated";

          text = text
            .replace(/\{channel\}/g, channel.name)
            .replace(/\{position\}/g, newPosition);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to set position.");
          return false;
        }
      },

      generateCode(node) {
        const pos = parseInt(node.data.position) || 0;

        const msg = (node.data.message || "Position updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Position ─────────────────────────
const channel = message.channel;

channel.setPosition(${pos})
  .then(() => {
    message.channel.send(
      \`${msg}\`
        .replace(/\\{channel\\}/g, channel.name)
        .replace(/\\{position\\}/g, ${pos})
    );
  })
  .catch(() => {
    message.reply("❌ Failed to set position.");
});
`;
      }
    }
  }
};