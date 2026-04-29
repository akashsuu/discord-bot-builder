'use strict';

module.exports = {
  nodes: {
    is_thread_only: {

      async execute(node, message, ctx) {
        if (!message) return false;

        const channel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!channel) return false;

        let isThread = false;

        // 🔹 v14 check
        if (typeof channel.isThread === "function") {
          isThread = channel.isThread();
        } else {
          // fallback (older versions)
          isThread = [10, 11, 12].includes(channel.type);
        }

        // 🔹 Save context
        if (ctx) {
          ctx.isThread = isThread;
        }

        return isThread; // 🔥 ONLY true passes
      },

      generateCode(node) {
        return `
// ── Thread Only ─────────────────────────
if (message.channel.isThread && message.channel.isThread()) {
  // allowed
}
`;
      }
    }
  }
};