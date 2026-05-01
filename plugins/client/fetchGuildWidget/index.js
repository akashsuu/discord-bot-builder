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
        const widget = await client.fetchGuildWidget(guildId);

        // 🔹 Save to context
        const key = node.data.saveAs || "guildWidget";
        if (ctx) {
          ctx[key] = widget;
        }

        // 🔹 Output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, widget.name || "Unknown")
          .replace(/\{online\}/g, widget.presenceCount || "0")
          .replace(/\{invite\}/g, widget.instantInvite || "None");

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch guild widget:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Guild Widget ─────────────────────
client.fetchGuildWidget("${node.data.guildId}")
  .then(widget => {
    console.log(widget.name);
  })
  .catch(console.error);
`;
    }
  }
};