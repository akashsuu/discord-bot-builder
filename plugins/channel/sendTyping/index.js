'use strict';

module.exports = {
  nodes: {
    send_typing: {

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

        const duration = parseInt(node.data.duration) || 2000;

        try {
          // Start typing
          await channel.sendTyping();

          // Wait for duration
          await new Promise(resolve => setTimeout(resolve, duration));

          return true;

        } catch (err) {
          return false;
        }
      },

      generateCode(node) {
        const duration = parseInt(node.data.duration) || 2000;

        return `
// ── Send Typing ─────────────────────────
await message.channel.sendTyping();

await new Promise(r => setTimeout(r, ${duration}));
`;
      }
    }
  }
};