'use strict';

module.exports = {
  nodes: {
    to_string: {

      async execute(node, message, ctx) {
        if (!message) return false;

        let value;

        // 🔹 Get source
        if (node.data.sourceKey && ctx && ctx[node.data.sourceKey] !== undefined) {
          value = ctx[node.data.sourceKey];
        } else {
          // fallback
          value = message.content;
        }

        let str;

        try {
          // 🔹 Convert to string
          if (typeof value === "string") {
            str = value;
          } else if (typeof value === "object") {
            str = JSON.stringify(value);
          } else {
            str = String(value);
          }
        } catch {
          str = "[Invalid Value]";
        }

        // 🔹 Save to context
        const saveKey = node.data.saveAs || "string";
        if (ctx) {
          ctx[saveKey] = str;
        }

        // 🔹 Output
        let text = node.data.output || "{string}";
        text = text.replace(/\{string\}/g, str);

        try {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
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
// ── To String ─────────────────────────
const value = ""; // your value here
const str = typeof value === "object"
  ? JSON.stringify(value)
  : String(value);

message.channel.send(str);
`;
      }
    }
  }
};