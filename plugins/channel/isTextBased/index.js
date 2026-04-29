'use strict';

module.exports = {
  nodes: {
    is_text_based: {

      async execute(node, message, ctx) {
        if (!message) return false;

        // 🔹 Get channel from priority: ctx → message
        const channel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!channel) return false;

        let result = false;

        // 🔹 Main check (discord.js v14)
        if (typeof channel.isTextBased === "function") {
          result = channel.isTextBased();
        } else {
          // fallback (older versions)
          result = !!channel.send;
        }

        // 🔹 Save to context
        if (ctx) {
          ctx.isTextBased = result;
        }

        return result;
      },

      generateCode(node) {
        return `
// ── Is Text Based ─────────────────────────
const channel = message.channel;

if (channel.isTextBased && channel.isTextBased()) {
  // condition passed
}
`;
      }
    }
  }
};