'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event;

      try {
        if (event && event.trim() !== "") {
          // 🔹 Remove all listeners for specific event
          client.removeAllListeners(event);
        } else {
          // 🔹 Remove ALL listeners (danger mode)
          client.removeAllListeners();
        }

        if (ctx) {
          ctx.allListenersRemoved = true;
        }

        let text = node.data.message || "Listeners cleared";
        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to remove listeners:", err);
        return false;
      }
    },

    generateCode(node) {
      if (node.data.event) {
        return `
// ── Remove All Listeners (Event) ───────────
client.removeAllListeners("${node.data.event}");
`;
      }

      return `
// ── Remove All Listeners (ALL) ─────────────
client.removeAllListeners();
`;
    }
  }
};