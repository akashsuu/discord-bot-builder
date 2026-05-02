'use strict';

module.exports = {
  nodes: {
    emoji_fetch_author: {

      async execute(node, message, ctx) {

        let reaction = null;
        let author = null;

        // 🔹 Get reaction from event
        if (ctx?.event && ctx.event[0]) {
          reaction = ctx.event[0]; // [reaction, user]
        }

        if (!reaction) {
          console.warn("⚠️ No reaction found");
          return false;
        }

        try {
          // 🔹 Handle partials
          if (reaction.partial) {
            await reaction.fetch();
          }

          if (reaction.message.partial) {
            await reaction.message.fetch();
          }

          author = reaction.message.author;

        } catch (err) {
          console.error("❌ Failed to fetch message:", err);
          return false;
        }

        if (!author) {
          console.warn("⚠️ No author found");
          return false;
        }

        // 🔹 Save to context
        if (ctx) {
          ctx[node.data.saveAs || "reactionAuthor"] = author;
        }

        // 🔹 Output
        let text = node.data.output || "{username}";

        text = text
          .replace(/\{username\}/g, author.username)
          .replace(/\{id\}/g, author.id)
          .replace(/\{tag\}/g, author.tag);

        try {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else if (reaction.message.channel) {
            await reaction.message.channel.send(text);
          }
        } catch {}

        return true;
      },

      generateCode(node) {
        return `
// ── Emoji Fetch Author ─────────────────────
client.on("messageReactionAdd", async (reaction) => {
  if (reaction.partial) await reaction.fetch();
  const author = reaction.message.author;
  console.log(author.username);
});
`;
      }
    }
  }
};