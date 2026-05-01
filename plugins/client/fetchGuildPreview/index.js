'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const guildId = node.data.guildId;

      if (!guildId) {
        console.error("❌ No guild ID provided");
        return false;
      }

      try {
        // 🔹 Fetch preview
        const preview = await client.fetchGuildPreview(guildId);

        // 🔹 Save to context
        const key = node.data.saveAs || "guildPreview";
        if (ctx) {
          ctx[key] = preview;
        }

        // 🔹 Prepare output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, preview.name || "Unknown")
          .replace(/\{members\}/g, preview.approximateMemberCount || "0")
          .replace(/\{description\}/g, preview.description || "No description");

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch guild preview:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Guild Preview ─────────────────────
client.fetchGuildPreview("${node.data.guildId}")
  .then(preview => {
    console.log(preview.name);
  })
  .catch(console.error);
`;
    }
  }
};