'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      try {
        // 🔹 Fetch via REST
        const regions = await client.rest.get('/voice/regions');

        // 🔹 Save to context
        const key = node.data.saveAs || "voiceRegions";
        if (ctx) {
          ctx[key] = regions;
        }

        // 🔹 Output
        let text = node.data.output || "Regions fetched";

        text = text.replace(/\{count\}/g, regions.length);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch voice regions:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Voice Regions ─────────────────────
client.rest.get('/voice/regions')
  .then(regions => {
    console.log("Regions:", regions.length);
  })
  .catch(console.error);
`;
    }
  }
};