'use strict';

module.exports = {
  nodes: {
    is_sendable: {

      async execute(node, message, ctx) {
        if (!message) return false;

        // 🔹 Determine channel source
        let channel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!channel) return false;

        let result = false;

        // 🔹 Check sendable safely
        if (typeof channel.isSendable === "function") {
          result = channel.isSendable();
        } else {
          // fallback for older versions
          result = channel.isTextBased && channel.isTextBased();
        }

        // 🔹 Save to context
        if (ctx) {
          ctx.isSendable = result;
        }

        return result;
      },

      generateCode(node) {
        return `
// ── Is Sendable ─────────────────────────
const channel = message.channel;

if (channel.isSendable && channel.isSendable()) {
  // condition passed
}
`;
      }
    }
  }
};