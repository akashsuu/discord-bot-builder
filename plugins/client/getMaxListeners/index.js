'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      try {
        // 🔹 Get max listeners
        const value = client.getMaxListeners();

        // 🔹 Save to context
        const key = node.data.saveAs || "maxListeners";
        if (ctx) {
          ctx[key] = value;
        }

        // 🔹 Output
        let text = node.data.output || "{value}";
        text = text.replace(/\{value\}/g, value);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to get max listeners:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Get Max Listeners ─────────────────────
console.log(client.getMaxListeners());
`;
    }
  }
};