'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_nsfw: {

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

        // 🔹 Check support
        if (typeof channel.setNSFW !== "function") {
          await message.reply("❌ This channel type does not support NSFW.");
          return false;
        }

        const nsfw = node.data.nsfw === true || node.data.nsfw === "true";

        try {
          await channel.setNSFW(nsfw);

          if (ctx) {
            ctx.updatedChannel = channel;
          }

          let text = node.data.message || "NSFW updated";

          text = text
            .replace(/\{nsfw\}/g, nsfw ? "enabled" : "disabled")
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to update NSFW.");
          return false;
        }
      },

      generateCode(node) {
        const nsfw = node.data.nsfw === true || node.data.nsfw === "true";

        const msg = (node.data.message || "NSFW updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set NSFW ─────────────────────────
const channel = message.channel;

channel.setNSFW(${nsfw})
  .then(() => {
    message.channel.send(
      \`${msg}\`
        .replace(/\\{nsfw\\}/g, "${nsfw ? "enabled" : "disabled"}")
        .replace(/\\{channel\\}/g, channel.name)
    );
  })
  .catch(() => {
    message.reply("❌ Failed to update NSFW.");
  });
`;
      }
    }
  }
};