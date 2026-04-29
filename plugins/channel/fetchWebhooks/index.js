'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    fetch_webhooks: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
          await message.reply("❌ You need **Manage Webhooks** permission.");
          return false;
        }

        // Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        try {
          const webhooks = await channel.fetchWebhooks();

          const list = Array.from(webhooks.values());

          // Save to context
          if (ctx) {
            ctx[node.data.saveAs || "webhooks"] = list;
          }

          let text = node.data.output || "Found {count} webhooks";

          text = text
            .replace(/\{count\}/g, list.length)
            .replace(/\{channel\}/g, channel.name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to fetch webhooks.");
          return false;
        }
      },

      generateCode(node) {
        const tpl = (node.data.output || "Found {count} webhooks")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Fetch Webhooks ─────────────────────────
const channel = message.channel;

channel.fetchWebhooks()
  .then(webhooks => {
    const list = Array.from(webhooks.values());

    const msg = \`${tpl}\`
      .replace(/\\{count\\}/g, list.length)
      .replace(/\\{channel\\}/g, channel.name);

    message.channel.send(msg);
  })
  .catch(() => {
    message.reply("❌ Failed to fetch webhooks.");
  });
`;
      }
    }
  }
};