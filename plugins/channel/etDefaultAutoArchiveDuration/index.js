'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_auto_archive: {

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

        const duration = parseInt(node.data.duration) || 1440;

        try {
          // Only valid for text/forum channels
          if (!channel.setDefaultAutoArchiveDuration) {
            await message.reply("❌ This channel does not support auto archive.");
            return false;
          }

          await channel.setDefaultAutoArchiveDuration(duration);

          const text = (node.data.message || "Auto archive updated")
            .replace(/\{duration\}/g, duration)
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to update auto archive.");
          return false;
        }
      },

      generateCode(node) {
        const duration = parseInt(node.data.duration) || 1440;

        const msg = (node.data.message || "Auto archive updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Auto Archive ─────────────────────────
const channel = message.channel;

if (channel.setDefaultAutoArchiveDuration) {
  channel.setDefaultAutoArchiveDuration(${duration})
    .then(() => {
      message.channel.send(
        \`${msg}\`
          .replace(/\\{duration\\}/g, ${duration})
          .replace(/\\{channel\\}/g, channel.name)
      );
    })
    .catch(() => {
      message.reply("❌ Failed to update auto archive.");
    });
}
`;
      }
    }
  }
};