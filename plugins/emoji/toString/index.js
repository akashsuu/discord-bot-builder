'use strict';

module.exports = {
  nodes: {
    to_string: {

      async execute(node, message, ctx) {

        let value;

        // 🔹 Select source
        switch (node.data.source) {
          case "message":
            value = message.content;
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

        // 🔹 Resolve path (ctx.user.name etc.)
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

        // 🔹 Convert to string
        let result;

        try {
          if (typeof value === "object") {
            result = JSON.stringify(value);
          } else {
            result = String(value);
          }
        } catch {
          result = "[unstringifiable]";
        }

        // 🔹 Save
        if (ctx) {
          ctx[node.data.saveAs || "string"] = result;
        }

        // 🔹 Output
        let text = node.data.output || "{value}";
        text = text.replace(/\{value\}/g, result);

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
// ── To String ─────────────────────
const result = String(value);
console.log(result);
`;
      }
    }
  }
};