'use strict';

module.exports = {
  nodes: {
    value_of: {

      async execute(node, message, ctx) {

        let value;

        // 🔹 Select source
        switch (node.data.source) {
          case "message":
            value = message;
            break;
          case "author":
            value = message.author;
            break;
          case "channel":
            value = message.channel;
            break;
          case "ctx":
          default:
            value = ctx;
        }

        // 🔹 Resolve path
        if (node.data.path && value) {
          const parts = node.data.path.split(".");
          for (const p of parts) {
            if (value && typeof value === "object") {
              value = value[p];
            } else {
              value = undefined;
              break;
            }
          }
        }

        let result;

        try {
          if (value && typeof value.valueOf === "function") {
            result = value.valueOf();
          } else {
            result = value;
          }
        } catch {
          result = null;
        }

        // 🔹 Save
        if (ctx) {
          ctx[node.data.saveAs || "value"] = result;
        }

        // 🔹 Output
        let text = node.data.output || "{value}";
        text = text.replace(/\{value\}/g, String(result));

        try {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {}

        return true;
      },

      generateCode(node) {
        return `
// ── Value Of ─────────────────────
const result = value.valueOf();
console.log(result);
`;
      }
    }
  }
};