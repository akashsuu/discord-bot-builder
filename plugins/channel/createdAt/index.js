'use strict';

module.exports = {
  nodes: {
    created_at: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;

        const targetType = (node.data.target || "channel").toLowerCase();

        let target;
        let label = "Channel";

        // 🔹 Determine target
        if (targetType === "user") {
          target = message.mentions.users.first() || message.author;
          label = "User";
        } else if (targetType === "channel") {
          target = message.mentions.channels.first() || message.channel;
          label = "Channel";
        } else {
          return false;
        }

        if (!target || !target.createdAt) return false;

        const date = target.createdAt.toLocaleString();

        // 🔹 Template system
        let text = node.data.output || "Created at: {date}";

        text = text
          .replace(/\{date\}/g, date)
          .replace(/\{target\}/g, label)
          .replace(/\{name\}/g, target.name || target.username || "unknown");

        // 🔹 Send output
        if (ctx && ctx.sendEmbed && node.data.useEmbed) {
          await ctx.sendEmbed(message, node.data, text);
        } else {
          await message.channel.send(text);
        }

        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || "Created at: {date}")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Created At ─────────────────────────────
const target = message.mentions.users.first() || message.channel;

if (target && target.createdAt) {
  const date = target.createdAt.toLocaleString();

  const msg = \`${tpl}\`
    .replace(/\\{date\\}/g, date)
    .replace(/\\{target\\}/g, "Target");

  message.channel.send(msg);
}
`;
      }
    }
  }
};