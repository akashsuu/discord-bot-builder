'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_slowmode: {

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

        // 🔹 Validate channel type
        if (!channel.isTextBased || !channel.isTextBased()) {
          await message.reply("❌ This channel does not support slowmode.");
          return false;
        }

        let seconds = parseInt(node.data.seconds);
        if (isNaN(seconds)) seconds = 0;

        // Clamp (Discord limit: 0–21600 seconds)
        seconds = Math.max(0, Math.min(21600, seconds));

        try {
          await channel.setRateLimitPerUser(seconds);

          if (ctx) {
            ctx.updatedChannel = channel;
          }

          let text = node.data.message || "Slowmode updated";

          text = text
            .replace(/\{seconds\}/g, seconds)
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to set slowmode.");
          return false;
        }
      },

      generateCode(node) {
        let seconds = parseInt(node.data.seconds) || 0;

        const msg = (node.data.message || "Slowmode updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Slowmode ─────────────────────────
const channel = message.channel;

channel.setRateLimitPerUser(${seconds})
  .then(() => {
    message.channel.send(
      \`${msg}\`
        .replace(/\\{seconds\\}/g, ${seconds})
        .replace(/\\{channel\\}/g, channel.name)
    );
  })
  .catch(() => {
    message.reply("❌ Failed to set slowmode.");
});
`;
      }
    }
  }
};