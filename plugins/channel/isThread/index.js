'use strict';

module.exports = {
  nodes: {
    is_thread: {

      async execute(node, message, ctx) {
        if (!message) return false;

        // 🔹 Get channel
        const channel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!channel) return false;

        let result = false;

        // 🔹 discord.js v14 thread check
        if (typeof channel.isThread === "function") {
          result = channel.isThread();
        } else {
          // fallback (older versions)
          result = channel.type === 10 || channel.type === 11 || channel.type === 12;
        }

        // 🔹 Save to context
        if (ctx) {
          ctx.isThread = result;
        }

        return result;
      },

      generateCode(node) {
        return `
// ── Is Thread ─────────────────────────
const channel = message.channel;

if (channel.isThread && channel.isThread()) {
  // condition passed
}
`;
      }
    }
  }
};