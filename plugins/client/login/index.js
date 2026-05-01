'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx, engine) {
      if (!client) {
        console.error("❌ Client not found");
        return false;
      }

      let token = node.data.token;

      // 🔹 ENV support
      if (node.data.useEnv) {
        token = process.env.BOT_TOKEN;
      }

      if (!token) {
        console.error("❌ No token provided");
        return false;
      }

      try {
        await client.login(token);

        if (ctx) {
          ctx.loggedIn = true;
        }

        console.log("🔐 Client login successful");

        // 🔥 Continue flow AFTER ready
        client.once("ready", async () => {
          if (engine && engine.runNext) {
            await engine.runNext(node, { client });
          }
        });

        return true;

      } catch (err) {
        console.error("❌ Login failed:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Client Login ─────────────────────
client.login("${node.data.token}");
`;
    }
  }
};