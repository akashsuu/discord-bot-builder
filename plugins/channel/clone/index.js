'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    clone_channel: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply("❌ You need **Manage Channels** permission.");
          return false;
        }

        // Get channel
        const channelId = node.data.channelId || message.channel.id;
        const sourceChannel = guild.channels.cache.get(channelId);

        if (!sourceChannel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // New name
        let newName = node.data.newName || `${sourceChannel.name}-clone`;
        newName = newName.replace(/\{channel\}/g, sourceChannel.name);

        try {
          const cloned = await sourceChannel.clone({
            name: newName
          });

          const text = node.data.sendMessage || "Channel cloned!";

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          // Save cloned channel in context
          if (ctx) {
            ctx.clonedChannel = cloned;
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to clone channel.");
          return false;
        }
      },

      generateCode(node) {
        const nameTpl = (node.data.newName || "{channel}-clone")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const msg = (node.data.sendMessage || "Channel cloned!")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Clone Channel ─────────────────────────────
if (!message.guild) return;

const sourceChannel = message.guild.channels.cache.get("${node.data.channelId}") || message.channel;

if (sourceChannel) {
  const newName = \`${nameTpl}\`.replace(/\\{channel\\}/g, sourceChannel.name);

  sourceChannel.clone({ name: newName })
    .then(cloned => {
      message.channel.send(\`${msg}\`);
    })
    .catch(() => {
      message.reply("❌ Failed to clone channel.");
    });
}
`;
      }
    }
  }
};