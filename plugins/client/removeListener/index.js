'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event || "messageCreate";
      const key = node.data.listenerKey || "listenerRef";

      try {
        if (!ctx || !ctx[key]) {
          console.warn("⚠️ No listener found in ctx");
          return false;
        }

        const handler = ctx[key];

        // 🔹 Remove specific listener
        client.off(event, handler);

        if (ctx) {
          ctx.listenerRemoved = true;
        }

        console.log(node.data.message || "Listener removed");

        return true;

      } catch (err) {
        console.error("❌ Failed to remove listener:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Remove Listener (Single) ─────────────
client.off("${node.data.event}", handler);
`;
    }
  }
};