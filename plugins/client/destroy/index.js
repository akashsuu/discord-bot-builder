'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return;

      try {
        // 🔹 Optional message (if ctx has channel)
        if (ctx && ctx.channel) {
          try {
            await ctx.channel.send(node.data.message || "Bot stopped");
          } catch {}
        }

        // 🔹 Destroy client
        await client.destroy();

        if (ctx) {
          ctx.clientDestroyed = true;
        }

        console.log("⛔ Client destroyed");

      } catch (err) {
        console.error("Destroy error:", err);
      }
    },

    generateCode(node) {
      return `
// ── Destroy Client ─────────────────────────
client.destroy();
console.log("Bot stopped");
`;
    }
  }
};