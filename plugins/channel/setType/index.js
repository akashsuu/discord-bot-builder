'use strict';

const { PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  nodes: {
    set_type: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // 🔹 Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // 🔹 Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // 🔹 Target type
        const typeInput = (node.data.type || "text").toLowerCase();

        let newType = ChannelType.GuildText;
        if (typeInput === "voice") newType = ChannelType.GuildVoice;
        if (typeInput === "category") newType = ChannelType.GuildCategory;

        try {
          // 🔹 Clone channel with new type
          const cloned = await guild.channels.create({
            name: channel.name,
            type: newType,
            parent: channel.parent,
            permissionOverwrites: channel.permissionOverwrites.cache
          });

          // 🔹 Save context
          if (ctx) {
            ctx.convertedChannel = cloned;
          }

          // 🔹 Delete original if enabled
          if (node.data.deleteOriginal === true || node.data.deleteOriginal === "true") {
            await channel.delete("Converted channel type");
          }

          let text = node.data.message || "Channel converted";

          text = text
            .replace(/\{old\}/g, channel.name)
            .replace(/\{new\}/g, cloned.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to convert channel type.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Convert Channel Type ─────────────────────
const { ChannelType } = require("discord.js");

const oldChannel = message.channel;

message.guild.channels.create({
  name: oldChannel.name,
  type: ChannelType.GuildText
}).then(newChannel => {
  message.channel.send("🔄 Channel converted");
});
`;
      }
    }
  }
};