'use strict';

module.exports = {
  nodes: {
    to_json: {

      async execute(node, message, ctx) {

        let data;

        // 🔹 Select source
        switch (node.data.source) {
          case "ctx":
            data = ctx;
            break;
          case "author":
            data = message.author;
            break;
          case "channel":
            data = message.channel;
            break;
          default:
            data = message;
        }

        let json;

        try {
          json = JSON.stringify(
            data,
            null,
            node.data.pretty ? 2 : 0
          );
        } catch {
          json = '{"error":"Failed to stringify"}';
        }

        // 🔹 Save
        if (ctx) {
          ctx[node.data.saveAs || "json"] = json;
        }

        // 🔹 Output
        let text = node.data.output || "{json}";
        text = text.replace(/\{json\}/g, json);

        try {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          await message.channel.send("⚠️ JSON too large.");
        }

        return true;
      },

      generateCode(node) {
        return `
// ── To JSON ─────────────────────────
const json = JSON.stringify(data, null, 2);
console.log(json);
`;
      }
    }
  }
};