'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      let input = node.data.invite;

      if (!input) {
        console.error("❌ No invite provided");
        return false;
      }

      // 🔹 Extract code from URL
      const code = input.replace(/https?:\/\/discord\.gg\//, "");

      try {
        const invite = await client.fetchInvite(code);

        // 🔹 Save to context
        const key = node.data.saveAs || "inviteData";
        if (ctx) {
          ctx[key] = invite;
        }

        // 🔹 Output
        let text = node.data.output || "{code}";

        text = text
          .replace(/\{code\}/g, invite.code)
          .replace(/\{guild\}/g, invite.guild?.name || "Unknown")
          .replace(/\{channel\}/g, invite.channel?.name || "Unknown")
          .replace(/\{uses\}/g, invite.uses ?? "0");

        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch invite:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Invite (Client) ─────────────────────
client.fetchInvite("${node.data.invite}")
  .then(invite => {
    console.log(invite.code);
  })
  .catch(console.error);
`;
    }
  }
};