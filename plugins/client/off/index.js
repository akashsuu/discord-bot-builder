'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event || "messageCreate";
      const removeAll = node.data.removeAll === true || node.data.removeAll === "true";

      try {
        if (removeAll) {
          // 🔹 Remove all listeners for event
          client.removeAllListeners(event);
        } else {
          // 🔹 Remove one listener (from ctx if stored)
          if (ctx && ctx.listenerRef) {
            client.off(event, ctx.listenerRef);
          } else {
            console.warn("⚠️ No listener reference found in ctx.listenerRef");
            return false;
          }
        }

        if (ctx) {
          ctx.listenerRemoved = true;
        }

        let text = node.data.message || "Listener removed";
        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to remove listener:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Remove Listener ─────────────────────
client.removeAllListeners("${node.data.event}");
`;
    }
  }
};