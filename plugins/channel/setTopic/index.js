'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_topic: {

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

        // 🔹 Check if supports topic
        if (!channel.isTextBased || !channel.isTextBased()) {
          await message.reply("❌ This channel does not support topics.");
          return false;
        }

        // 🔹 Topic content
        let topic = node.data.topic || "";

        // Variables
        topic = topic
          .replace(/\{user\}/g, message.author.username)
          .replace(/\{channel\}/g, channel.name);

        try {
          await channel.setTopic(topic);

          if (ctx) {
            ctx.updatedChannel = channel;
          }

          let text = node.data.message || "Topic updated";

          text = text.replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to set topic.");
          return false;
        }
      },

      generateCode(node) {
        const topic = (node.data.topic || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const msg = (node.data.message || "Topic updated")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Topic ─────────────────────────
const channel = message.channel;

channel.setTopic(\`${topic}\`)
  .then(() => {
    message.channel.send(
      \`${msg}\`.replace(/\\{channel\\}/g, channel.name)
    );
  })
  .catch(() => {
    message.reply("❌ Failed to set topic.");
});
`;
      }
    }
  }
};