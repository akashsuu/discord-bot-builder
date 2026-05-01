'use strict';

module.exports = {
  nodes: {
    to_json_pro: {

      async execute(node, message, ctx) {
        let data;

        // 🔹 Get source
        if (node.data.sourceKey && ctx && ctx[node.data.sourceKey] !== undefined) {
          data = ctx[node.data.sourceKey];
        } else {
          data = {
            content: message.content,
            author: message.author?.username
          };
        }

        // 🔹 Resolve nested path
        if (node.data.path && data) {
          const parts = node.data.path.split(".");
          for (const p of parts) {
            if (data && typeof data === "object" && p in data) {
              data = data[p];
            } else {
              data = undefined;
              break;
            }
          }
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

        // 🔹 Limit size (Discord safe)
        const limit = parseInt(node.data.limit) || 1900;
        if (json.length > limit) {
          json = json.slice(0, limit) + "\n... (truncated)";
        }

        // 🔹 Save to context
        const key = node.data.saveAs || "json";
        if (ctx) {
          ctx[key] = json;
        }

        // 🔹 Output
        let text = node.data.output || "{json}";
        text = text.replace(/\{json\}/g, json);

        try {
          if (node.data.sendAsFile) {
            await message.channel.send({
              files: [
                {
                  attachment: Buffer.from(json),
                  name: "data.json"
                }
              ]
            });
          } else if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          await message.channel.send("⚠️ JSON too large to send.");
        }

        return true;
      },

      generateCode(node) {
        return `
// ── To JSON (Pro) ─────────────────────
const json = JSON.stringify(data, null, 2);
console.log(json);
`;
      }
    }
  }
};