'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      const event = node.data.event || "customEvent";
      const dataKey = node.data.dataKey;

      let payload = null;

      // 🔹 Get data from ctx if provided
      if (dataKey && ctx && ctx[dataKey] !== undefined) {
        payload = ctx[dataKey];
      }

      try {
        // 🔹 Emit event
        if (payload !== null) {
          client.emit(event, payload);
        } else {
          client.emit(event);
        }

        if (ctx) {
          ctx.lastEmittedEvent = event;
        }

        // 🔹 Optional message
        let text = node.data.message || "Event emitted";
        text = text.replace(/\{event\}/g, event);

        if (ctx && ctx.sendEmbed && node.data.useEmbed) {
          await ctx.sendEmbed(null, node.data, text);
        }

        return true;

      } catch (err) {
        console.error("Emit error:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Emit Event ─────────────────────────
client.emit("${node.data.event}");
`;
    }
  }
};