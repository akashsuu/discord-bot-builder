'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      let ready = false;

      try {
        // 🔹 Check ready state
        if (typeof client.isReady === "function") {
          ready = client.isReady();
        } else {
          // fallback
          ready = !!client.user;
        }

        // 🔹 Save to context
        if (ctx) {
          ctx.clientReady = ready;
        }

        return ready;

      } catch (err) {
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Is Ready ─────────────────────────
if (client.isReady()) {
  // client is ready
}
`;
    }
  }
};