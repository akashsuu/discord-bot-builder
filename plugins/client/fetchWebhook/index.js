'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const id = node.data.webhookId;
      const token = node.data.webhookToken;

      if (!id) {
        console.error("❌ No webhook ID provided");
        return false;
      }

      try {
        let webhook;

        // 🔹 With token (more access)
        if (token) {
          webhook = await client.fetchWebhook(id, token);
        } else {
          webhook = await client.fetchWebhook(id);
        }

        // 🔹 Save to context
        const key = node.data.saveAs || "webhook";
        if (ctx) {
          ctx[key] = webhook;
        }

        // 🔹 Output
        let text = node.data.output || "{name}";

        text = text
          .replace(/\{name\}/g, webhook.name || "Unknown")
          .replace(/\{channel\}/g, webhook.channel?.name || "Unknown")
          .replace(/\{id\}/g, webhook.id);

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch webhook:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Webhook ─────────────────────────
client.fetchWebhook("${node.data.webhookId}", "${node.data.webhookToken}")
  .then(webhook => {
    console.log(webhook.name);
  })
  .catch(console.error);
`;
    }
  }
};