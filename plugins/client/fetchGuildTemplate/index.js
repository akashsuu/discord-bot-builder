'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      let input = node.data.template;

      if (!input) {
        console.error("❌ No template provided");
        return false;
      }

      // 🔹 Extract code from URL if needed
      const code = input.replace(/https?:\/\/discord\.new\//, "");

      try {
        const template = await client.fetchGuildTemplate(code);

        // 🔹 Save to context
        const key = node.data.saveAs || "guildTemplate";
        if (ctx) {
          ctx[key] = template;
        }

        // 🔹 Output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, template.name || "Unknown")
          .replace(/\{uses\}/g, template.usageCount || "0")
          .replace(/\{description\}/g, template.description || "No description");

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch template:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Guild Template ─────────────────────
client.fetchGuildTemplate("${node.data.template}")
  .then(template => {
    console.log(template.name);
  })
  .catch(console.error);
`;
    }
  }
};