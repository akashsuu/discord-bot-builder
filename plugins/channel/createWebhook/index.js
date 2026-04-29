'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    create_webhook: {

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

        const name = node.data.name || "My Webhook";
        const avatar = node.data.avatarURL || null;
        const content = node.data.content || "";
        const sendNow = node.data.sendNow === true || node.data.sendNow === "true";

        try {
          const webhook = await channel.createWebhook({
            name,
            avatar
          });

          // Save webhook in context
          if (ctx) {
            ctx.webhook = webhook;
            ctx.webhookURL = webhook.url;
          }

          // Send message via webhook
          if (sendNow) {
            if (node.data.useEmbed && ctx && ctx.buildEmbed) {
              const embed = ctx.buildEmbed(node.data, content);
              await webhook.send({ embeds: [embed] });
            } else {
              await webhook.send({ content });
            }
          }

          // Confirmation message
          const confirm = `🪝 Webhook created: ${webhook.url}`;

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, confirm);
          } else {
            await message.channel.send(confirm);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to create webhook.");
          return false;
        }
      },

      generateCode(node) {
        const name = (node.data.name || "My Webhook").replace(/"/g, '\\"');
        const avatar = node.data.avatarURL || null;

        const content = (node.data.content || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const sendNow = node.data.sendNow === true || node.data.sendNow === "true";

        return `
// ── Create Webhook ─────────────────────────────
const channel = message.channel;

channel.createWebhook({
  name: "${name}",
  avatar: ${avatar ? `"${avatar}"` : "null"}
}).then(webhook => {

  ${sendNow ? `
  webhook.send({
    content: \`${content}\`
  });
  ` : ""}

  message.channel.send("🪝 Webhook created: " + webhook.url);

}).catch(() => {
  message.reply("❌ Failed to create webhook.");
});
`;
      }
    }
  }
};