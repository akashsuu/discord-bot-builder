'use strict';

module.exports = {
  nodes: {
    channel_equals: {

      async execute(node, message, ctx) {
        if (!message || !message.channel) return false;

        const targetId = node.data.channelId;

        // Determine source channel
        const sourceChannel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!targetId) return false;

        const result = sourceChannel.id === targetId;

        // Save result (optional)
        if (ctx) {
          ctx.lastCondition = result;
        }

        return result; // 🔥 THIS controls flow
      },

      generateCode(node) {
        const id = node.data.channelId || "";

        return `
// ── Channel Equals ─────────────────────────
if (message.channel.id === "${id}") {
  // condition passed
}
`;
      }
    }
  }
};