'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      let value = parseInt(node.data.value);
      if (isNaN(value)) value = 10;

      try {
        // 🔹 Set max listeners
        client.setMaxListeners(value);

        if (ctx) {
          ctx.maxListeners = value;
        }

        // 🔹 Output
        let text = node.data.message || "Max listeners updated";
        text = text.replace(/\{value\}/g, value);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to set max listeners:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Set Max Listeners ─────────────────────
client.setMaxListeners(${parseInt(node.data.value) || 10});
`;
    }
  }
};