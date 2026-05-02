'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    emoji_edit: {

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

        // 🔹 Get emoji (ctx or ID)
        if (ctx?.emoji?.id) {
          emoji = guild.emojis.cache.get(ctx.emoji.id);
        }

        if (!emoji && node.data.emojiId) {
          emoji = guild.emojis.cache.get(node.data.emojiId);
        }

        if (!emoji) {
          await message.reply("❌ Emoji not found.");
          return false;
        }

        // 🔹 Prepare options
        const options = {};

        if (node.data.name && node.data.name.trim() !== "") {
          options.name = node.data.name;
        }

        if (node.data.roles && node.data.roles.trim() !== "") {
          const roleIds = node.data.roles.split(",").map(r => r.trim());
          options.roles = roleIds;
        }

        if (Object.keys(options).length === 0) {
          await message.reply("⚠️ Nothing to update.");
          return false;
        }

        try {
          await emoji.edit(options, node.data.reason || "Edited via bot");

          if (ctx) {
            ctx.emojiEdited = true;
          }

          const text = node.data.message || "Emoji updated";

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          console.error(err);
          await message.reply("❌ Failed to edit emoji.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Edit Emoji ─────────────────────
const emoji = message.guild.emojis.cache.get("${node.data.emojiId}");
emoji.edit({
  name: "${node.data.name}"
});
`;
      }
    }
  }
};