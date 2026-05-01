'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const stickerId = node.data.stickerId;

      if (!stickerId) {
        console.error("❌ No sticker ID provided");
        return false;
      }

      try {
        const sticker = await client.fetchSticker(stickerId);

        // 🔹 Save to context
        const key = node.data.saveAs || "sticker";
        if (ctx) {
          ctx[key] = sticker;
        }

        // 🔹 Output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, sticker.name || "Unknown")
          .replace(/\{type\}/g, sticker.format || "unknown")
          .replace(/\{id\}/g, sticker.id);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch sticker:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Sticker ─────────────────────────
client.fetchSticker("${node.data.stickerId}")
  .then(sticker => {
    console.log(sticker.name);
  })
  .catch(console.error);
`;
    }
  }
};