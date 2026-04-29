'use strict';

module.exports = {
  nodes: {
    fetch_channel: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;

        const guild = message.guild;

        let channel;

        // 🔹 Priority: node input → ctx → current
        if (node.data.channelId) {
          channel = guild.channels.cache.get(node.data.channelId);
        }

        if (!channel && ctx && ctx.channel) {
          channel = ctx.channel;
        }

        if (!channel) {
          channel = message.channel;
        }

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // 🔹 Save to context
        const key = node.data.saveAs || "channel";
        if (ctx) {
          ctx[key] = channel;
        }

        // 🔹 Output
        let text = node.data.output || "Fetched channel: {channel}";

        text = text
          .replace(/\{channel\}/g, channel.name)
          .replace(/\{id\}/g, channel.id);

        if (ctx && ctx.sendEmbed && node.data.useEmbed) {
          await ctx.sendEmbed(message, node.data, text);
        } else {
          await message.channel.send(text);
        }

        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || "Fetched channel: {channel}")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Fetch Channel ─────────────────────────
const channel = message.guild.channels.cache.get("${node.data.channelId}") || message.channel;

if (channel) {
  const msg = \`${tpl}\`
    .replace(/\\{channel\\}/g, channel.name)
    .replace(/\\{id\\}/g, channel.id);

  message.channel.send(msg);
}
`;
      }
    }
  }
};