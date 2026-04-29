'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    edit_channel: {

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

        // Build update object
        const updates = {};

        if (node.data.name) {
          updates.name = node.data.name
            .replace(/\{user\}/g, message.author.username)
            .replace(/\{channel\}/g, channel.name);
        }

        if (node.data.topic && channel.isTextBased()) {
          updates.topic = node.data.topic;
        }

        if (node.data.slowmode !== "") {
          updates.rateLimitPerUser = parseInt(node.data.slowmode) || 0;
        }

        if (node.data.nsfw !== "") {
          updates.nsfw = node.data.nsfw === true || node.data.nsfw === "true";
        }

        if (node.data.categoryId) {
          updates.parent = node.data.categoryId;
        }

        try {
          await channel.edit(updates);

          const text = (node.data.message || "Channel updated")
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to edit channel.");
          return false;
        }
      },

      generateCode(node) {
        const msg = (node.data.message || "Channel updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Edit Channel ───────────────────────────
const channel = message.channel;

channel.edit({
  name: "${node.data.name || ""}",
  topic: "${node.data.topic || ""}",
  rateLimitPerUser: ${parseInt(node.data.slowmode) || 0}
}).then(() => {
  message.channel.send(\`${msg}\`.replace(/\\{channel\\}/g, channel.name));
}).catch(() => {
  message.reply("❌ Failed to edit channel.");
});
`;
      }
    }
  }
};