'use strict';

module.exports = {
  nodes: {
    emoji_created_timestamp: {

      async execute(node, message, ctx) {
        let emoji;

        // 🔹 Get emoji source
        if (node.data.source === "ctx" && ctx?.emoji) {
          emoji = ctx.emoji;
        } else if (node.data.source === "message") {
          emoji = message?.emoji;
        } else {
          emoji = ctx?.emoji;
        }

        if (!emoji) {
          console.warn("⚠️ No emoji found");
          return false;
        }

        // 🔹 Unicode case
        if (!emoji.id) {
          if (ctx) ctx[node.data.saveAs || "emojiTimestamp"] = null;

          try {
            await message.channel.send("❌ Unicode emoji has no timestamp");
          } catch {}

          return false;
        }

        try {
          // 🔥 Snowflake → timestamp
          const snowflake = BigInt(emoji.id);
          const timestamp = Number((snowflake >> 22n) + 1420070400000n);

          // 🔹 Save
          if (ctx) {
            ctx[node.data.saveAs || "emojiTimestamp"] = timestamp;
          }

          // 🔹 Output
          let text = node.data.output || "{value}";
          text = text.replace(/\{value\}/g, timestamp);

          try {
            if (ctx && ctx.sendEmbed && node.data.useEmbed) {
              await ctx.sendEmbed(message, node.data, text);
            } else {
              await message.channel.send(text);
            }
          } catch {}

          return true;

        } catch (err) {
          console.error("❌ Failed to parse emoji timestamp:", err);
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Emoji Created Timestamp ─────────────
const timestamp = (BigInt(emoji.id) >> 22n) + 1420070400000n;
console.log(Number(timestamp));
`;
      }
    }
  }
};