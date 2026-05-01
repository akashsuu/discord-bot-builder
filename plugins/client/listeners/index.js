'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event || "messageCreate";

      try {
        // 🔹 Get listeners array
        const listeners = client.listeners(event);

        // 🔹 Save to context
        const key = node.data.saveAs || "listeners";
        if (ctx) {
          ctx[key] = listeners;
        }

        // 🔹 Output
        let text = node.data.output || "{count}";
        text = text
          .replace(/\{count\}/g, listeners.length)
          .replace(/\{event\}/g, event);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to get listeners:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Get Listeners ─────────────────────
const listeners = client.listeners("${node.data.event}");
console.log(listeners.length);
`;
    }
  }
};