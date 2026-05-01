'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx, engine) {
      if (!client) return;

      const event = node.data.event || "ready";
      const saveKey = node.data.saveAs || "event";

      const handler = async (...args) => {
        try {
          // 🔹 Save event data
          if (ctx) {
            ctx[saveKey] = args.length === 1 ? args[0] : args;
          }

          // 🔹 Map common events
          if (ctx && event === "messageCreate") {
            ctx.message = args[0];
          }

          if (ctx && event === "interactionCreate") {
            ctx.interaction = args[0];
          }

          if (ctx && event === "guildMemberAdd") {
            ctx.member = args[0];
          }

          // 🔥 Trigger flow
          if (engine && engine.runNext) {
            await engine.runNext(node, { eventArgs: args });
          }

        } catch (err) {
          console.error("❌ Once Event error:", err);
        }
      };

      // 🔹 Attach once listener
      client.once(event, handler);

      // 🔹 Save reference (optional debug)
      if (ctx) {
        ctx.onceListenerRef = handler;
      }
    },

    generateCode(node) {
      return `
// ── Once Event ─────────────────────────
client.once("${node.data.event}", (...args) => {
  // handle event once
});
`;
    }
  }
};