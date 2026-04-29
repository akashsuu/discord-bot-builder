'use strict';

module.exports = {
  nodes: {
    value_of: {

      async execute(node, message, ctx) {
        if (!ctx) return false;

        const key = node.data.key;
        const path = node.data.path;

        if (!key || ctx[key] === undefined) {
          return false;
        }

        let value = ctx[key];

        // 🔹 Handle nested path (e.g., user.username)
        if (path) {
          const parts = path.split(".");
          for (const p of parts) {
            if (value && typeof value === "object" && p in value) {
              value = value[p];
            } else {
              value = undefined;
              break;
            }
          }
        }

        if (value === undefined) return false;

        // 🔹 Convert to string safely for output
        let display;
        if (typeof value === "object") {
          try {
            display = JSON.stringify(value);
          } catch {
            display = "[Object]";
          }
        } else {
          display = String(value);
        }

        // 🔹 Save to context
        const saveKey = node.data.saveAs || "value";
        ctx[saveKey] = value;

        // 🔹 Output
        let text = node.data.output || "{value}";
        text = text.replace(/\{value\}/g, display);

        try {
          if (ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          return false;
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Value Of ─────────────────────────
const value = ctx["${node.data.key}"];

message.channel.send(String(value));
`;
      }
    }
  }
};