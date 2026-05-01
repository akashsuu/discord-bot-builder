'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx, engine) {
      if (!client) return;

      const event = node.data.event || "messageCreate";
      const once = node.data.once === true || node.data.once === "true";
      const saveKey = node.data.saveAs || "eventData";

      const handler = async (...args) => {
        try {
          // 🔹 Save event data to context
          if (ctx) {
            ctx[saveKey] = args.length === 1 ? args[0] : args;
          }

          // 🔹 IMPORTANT: trigger next nodes
          if (engine && engine.runNext) {
            await engine.runNext(node, {
              eventArgs: args
            });
          }

        } catch (err) {
          console.error("Listener error:", err);
        }
      };

      // 🔹 Attach listener
      if (once) {
        client.once(event, handler);
      } else {
        client.on(event, handler);
      }

      if (ctx) {
        ctx.listenerAdded = true;
      }
    },

    generateCode(node) {
      return `
// ── Add Listener ─────────────────────────
client.on("${node.data.event}", (...args) => {
  // handle event
});
`;
    }
  }
};