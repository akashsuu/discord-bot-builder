'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event || "messageCreate";

      try {
        // 🔹 Get count
        const count = client.listenerCount(event);

        // 🔹 Save to context
        const key = node.data.saveAs || "listenerCount";
        if (ctx) {
          ctx[key] = count;
        }

        // 🔹 Output
        let text = node.data.output || "{count}";
        text = text
          .replace(/\{count\}/g, count)
          .replace(/\{event\}/g, event);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to get listener count:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Listener Count ─────────────────────
console.log(client.listenerCount("${node.data.event}"));
`;
    }
  }
};