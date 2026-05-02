'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    emoji_set_name: {

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

        // 🔹 Get emoji from ctx
        if (ctx?.emoji?.id) {
          emoji = guild.emojis.cache.get(ctx.emoji.id);
        }

        // 🔹 Fallback: ID
        if (!emoji && node.data.emojiId) {
          emoji = guild.emojis.cache.get(node.data.emojiId);
        }

        if (!emoji) {
          await message.reply("❌ Emoji not found.");
          return false;
        }

        const newName = node.data.name;

        if (!newName || newName.trim() === "") {
          await message.reply("⚠️ No name provided.");
          return false;
        }

        try {
          await emoji.setName(newName, node.data.reason || "Rename");

          if (ctx) {
            ctx.emojiRenamed = true;
            ctx.emojiNewName = newName;
          }

          let text = node.data.message || "Emoji renamed";
          text = text.replace(/\{name\}/g, newName);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          console.error(err);
          await message.reply("❌ Failed to rename emoji.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Emoji Set Name ─────────────────────
const emoji = message.guild.emojis.cache.get("${node.data.emojiId}");
emoji.setName("${node.data.name}");
`;
      }
    }
  }
};