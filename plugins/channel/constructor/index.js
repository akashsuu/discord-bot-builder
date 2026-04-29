'use strict';

const { PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  nodes: {
    channel_constructor: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;

        // Ignore bots
        if (message.author.bot) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // Parse settings
        let name = node.data.name || "new-channel";
        const typeInput = (node.data.type || "text").toLowerCase();
        const categoryId = node.data.categoryId || null;
        const topic = node.data.topic || null;

        // Dynamic variables
        name = name
          .replace(/\{user\}/g, message.author.username)
          .replace(/\{channel\}/g, message.channel.name);

        // Channel type mapping
        let type = ChannelType.GuildText;
        if (typeInput === "voice") type = ChannelType.GuildVoice;

        try {
          const created = await guild.channels.create({
            name,
            type,
            topic: type === ChannelType.GuildText ? topic : null,
            parent: categoryId || null
          });

          // Save to context
          if (ctx) {
            ctx.createdChannel = created;
          }

          const text = (node.data.sendMessage || "Channel created!")
            .replace(/\{channel\}/g, created.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to create channel.");
          return false;
        }
      },

      generateCode(node) {
        const nameTpl = (node.data.name || "new-channel")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const msg = (node.data.sendMessage || "Channel created!")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const type = (node.data.type || "text").toLowerCase() === "voice"
          ? "ChannelType.GuildVoice"
          : "ChannelType.GuildText";

        return `
// ── Channel Constructor ─────────────────────────
const { ChannelType } = require("discord.js");

if (!message.guild) return;

const _name = \`${nameTpl}\`
  .replace(/\\{user\\}/g, message.author.username)
  .replace(/\\{channel\\}/g, message.channel.name);

message.guild.channels.create({
  name: _name,
  type: ${type}
}).then(ch => {
  message.channel.send(\`${msg}\`.replace(/\\{channel\\}/g, ch.name));
}).catch(() => {
  message.reply("❌ Failed to create channel.");
});
`;
      }
    }
  }
};