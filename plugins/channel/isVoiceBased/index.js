'use strict';

module.exports = {
  nodes: {
    is_voice_based: {

      async execute(node, message, ctx) {
        if (!message) return false;

        // 🔹 Get channel
        const channel =
          (ctx && ctx.channel) ||
          message.channel;

        if (!channel) return false;

        let result = false;

        // 🔹 discord.js v14 check
        if (typeof channel.isVoiceBased === "function") {
          result = channel.isVoiceBased();
        } else {
          // fallback (older versions)
          result = [2, 13].includes(channel.type); // voice + stage
        }

        // 🔹 Save to context
        if (ctx) {
          ctx.isVoiceBased = result;
        }

        return result;
      },

      generateCode(node) {
        return `
// ── Is Voice Based ─────────────────────────
const channel = message.channel;

if (channel.isVoiceBased && channel.isVoiceBased()) {
  // condition passed
}
`;
      }
    }
  }
};