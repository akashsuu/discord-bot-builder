'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const packId = node.data.packId;

      if (!packId) {
        console.error("❌ No pack ID provided");
        return false;
      }

      try {
        const pack = await client.fetchStickerPack(packId);

        // 🔹 Save to context
        const key = node.data.saveAs || "stickerPack";
        if (ctx) {
          ctx[key] = pack;
        }

        // 🔹 Output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, pack.name || "Unknown")
          .replace(/\{count\}/g, pack.stickers?.size || "0")
          .replace(/\{description\}/g, pack.description || "No description");

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch sticker pack:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Sticker Pack ─────────────────────
client.fetchStickerPack("${node.data.packId}")
  .then(pack => {
    console.log(pack.name);
  })
  .catch(console.error);
`;
    }
  }
};