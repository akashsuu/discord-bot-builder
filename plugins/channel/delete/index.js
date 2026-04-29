'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    delete_channel: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // Get channel
        const channelId = node.data.channelId || message.channel.id;
        const target = guild.channels.cache.get(channelId);

        if (!target) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // Optional confirmation (basic)
        if (node.data.confirm) {
          await message.reply(`⚠️ Are you sure you want to delete **${target.name}**? Type \`yes\``);

          try {
            const collected = await message.channel.awaitMessages({
              filter: m => m.author.id === message.author.id,
              max: 1,
              time: 10000,
              errors: ["time"]
            });

            const answer = collected.first().content.toLowerCase();
            if (answer !== "yes") {
              await message.reply("❌ Cancelled.");
              return false;
            }

          } catch {
            await message.reply("⏱️ Confirmation timed out.");
            return false;
          }
        }

        const reason = node.data.reason || "Deleted via bot";

        try {
          const channelName = target.name;

          await target.delete(reason);

          // Save info in ctx
          if (ctx) {
            ctx.deletedChannel = channelName;
          }

          const text = (node.data.message || "Channel deleted")
            .replace(/\{channel\}/g, channelName);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to delete channel.");
          return false;
        }
      },

      generateCode(node) {
        const msg = (node.data.message || "Channel deleted")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Delete Channel ───────────────────────────
const target = message.channel;

target.delete("Deleted via bot")
  .then(() => {
    message.channel.send(\`${msg}\`.replace(/\\{channel\\}/g, target.name));
  })
  .catch(() => {
    message.reply("❌ Failed to delete channel.");
  });
`;
      }
    }
  }
};