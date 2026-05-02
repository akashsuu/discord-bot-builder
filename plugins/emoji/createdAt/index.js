'use strict';

module.exports = {
  nodes: {
    emoji_created_at: {

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

        // 🔹 Unicode emoji case
        if (!emoji.id) {
          const text = "❌ Unicode emoji has no creation date";

          if (ctx) ctx[node.data.saveAs || "emojiCreatedAt"] = null;

          try {
            await message.channel.send(text);
          } catch {}

          return false;
        }

        // 🔹 Custom emoji timestamp from ID (Discord snowflake)
        const snowflake = BigInt(emoji.id);
        const timestamp = Number((snowflake >> 22n) + 1420070400000n);

        let value = new Date(timestamp);

        // 🔹 Format
        if (node.data.format === "timestamp") {
          value = value.getTime();
        } else {
          value = value.toString();
        }

        // 🔹 Save
        if (ctx) {
          ctx[node.data.saveAs || "emojiCreatedAt"] = value;
        }

        // 🔹 Output
        let text = node.data.output || "{value}";
        text = text.replace(/\{value\}/g, value);

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
// ── Emoji Created At ─────────────────────
const timestamp = (BigInt(emoji.id) >> 22n) + 1420070400000n;
console.log(new Date(Number(timestamp)));
`;
      }
    }
  }
};