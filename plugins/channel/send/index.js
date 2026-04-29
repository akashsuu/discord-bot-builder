'use strict';

module.exports = {
  nodes: {
    send_message: {

      async execute(node, message, ctx) {
        if (!message) return false;

        // 🔹 Resolve channel
        let channel = null;

        if (node.data.channelId && message.guild) {
          channel = message.guild.channels.cache.get(node.data.channelId);
        }

        if (!channel && ctx && ctx.channel) {
          channel = ctx.channel;
        }

        if (!channel) {
          channel = message.channel;
        }

        if (!channel) return false;

        // 🔹 Safety check
        if (typeof channel.isSendable === "function" && !channel.isSendable()) {
          return false;
        }

        // 🔹 Content
        let content = node.data.content || "";

        // 🔹 Replace variables (basic system)
        content = content
          .replace(/\{user\}/g, message.author.username)
          .replace(/\{channel\}/g, channel.name);

        try {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, content);
          } else {
            await channel.send(content);
          }

          return true;

        } catch (err) {
          return false;
        }
      },

      generateCode(node) {
        const content = (node.data.content || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Send Message ─────────────────────────
const channel = message.channel;

const content = \`${content}\`
  .replace(/\\{user\\}/g, message.author.username)
  .replace(/\\{channel\\}/g, channel.name);

channel.send(content);
`;
      }
    }
  }
};