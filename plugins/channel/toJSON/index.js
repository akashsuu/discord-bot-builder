'use strict';

module.exports = {
  nodes: {
    to_json: {

      async execute(node, message, ctx) {
        if (!ctx) return false;

        const key = node.data.sourceKey;

        // 🔹 Get data
        let data;

        if (key && ctx[key] !== undefined) {
          data = ctx[key];
        } else {
          // fallback examples
          data = {
            user: message.author?.username,
            channel: message.channel?.name
          };
        }

        let jsonString;

        try {
          jsonString = JSON.stringify(
            data,
            null,
            node.data.pretty ? 2 : 0
          );
        } catch (err) {
          await message.reply("❌ Failed to convert to JSON.");
          return false;
        }

        // 🔹 Save to context
        const saveKey = node.data.saveAs || "json";
        ctx[saveKey] = jsonString;

        // 🔹 Output
        let text = node.data.output || "{json}";
        text = text.replace(/\{json\}/g, jsonString);

        try {
          if (ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          // fallback if too large
          await message.channel.send("⚠️ JSON too large to display.");
        }

        return true;
      },

      generateCode(node) {
        return `
// ── To JSON ─────────────────────────
const data = {}; // your object here

const json = JSON.stringify(data, null, 2);

message.channel.send(\`\`\`json
\${json}
\`\`\`);
`;
      }
    }
  }
};