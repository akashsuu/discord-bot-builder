'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx, engine) {
      if (!client) return;

      const event = node.data.event || "messageCreate";
      const once = node.data.once === true || node.data.once === "true";
      const saveKey = node.data.saveAs || "event";

      const handler = async (...args) => {
        try {
          // 🔹 Save event data
          if (ctx) {
            ctx[saveKey] = args.length === 1 ? args[0] : args;
          }

          // 🔹 Map common events (VERY IMPORTANT)
          if (ctx && event === "messageCreate") {
            ctx.message = args[0];
          }

          if (ctx && event === "interactionCreate") {
            ctx.interaction = args[0];
          }

          if (ctx && event === "guildMemberAdd") {
            ctx.member = args[0];
          }

          // 🔥 Trigger next nodes
          if (engine && engine.runNext) {
            await engine.runNext(node, { eventArgs: args });
          }

        } catch (err) {
          console.error("❌ On Event error:", err);
        }
      };

      // 🔹 Attach listener
      if (once) {
        client.once(event, handler);
      } else {
        client.on(event, handler);
      }

      // 🔹 Save reference (for removal later)
      if (ctx) {
        ctx.listenerRef = handler;
      }
    },

    generateCode(node) {
      return `
// ── On Event ─────────────────────────
client.on("${node.data.event}", (...args) => {
  // handle event
});
`;
    }
  }
};