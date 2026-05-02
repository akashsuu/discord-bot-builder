'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    emoji_delete: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // 🔹 Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
          await message.reply("❌ You need **Manage Emojis** permission.");
          return false;
        }

        let emoji = null;

        // 🔹 Priority: ctx → ID
        if (ctx && ctx.emoji && ctx.emoji.id) {
          emoji = guild.emojis.cache.get(ctx.emoji.id);
        }

        if (!emoji && node.data.emojiId) {
          emoji = guild.emojis.cache.get(node.data.emojiId);
        }

        if (!emoji) {
          await message.reply("❌ Emoji not found.");
          return false;
        }

        try {
          await emoji.delete(node.data.reason || "Deleted via bot");

          if (ctx) {
            ctx.emojiDeleted = true;
          }

          const text = node.data.message || "Emoji deleted";

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          console.error(err);
          await message.reply("❌ Failed to delete emoji.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Delete Emoji ─────────────────────
const emoji = message.guild.emojis.cache.get("${node.data.emojiId}");
emoji.delete();
`;
      }
    }
  }
};