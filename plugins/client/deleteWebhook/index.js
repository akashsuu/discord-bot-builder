'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    delete_webhook: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // 🔹 Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
          await message.reply("❌ You need **Manage Webhooks** permission.");
          return false;
        }

        let webhook = null;

        // 🔹 Priority: ctx → ID
        if (ctx && ctx.webhook) {
          webhook = ctx.webhook;
        }

        if (!webhook && node.data.webhookId) {
          try {
            webhook = await message.client.fetchWebhook(node.data.webhookId);
          } catch {}
        }

        if (!webhook) {
          await message.reply("❌ Webhook not found.");
          return false;
        }

        try {
          await webhook.delete("Deleted via bot");

          if (ctx) {
            ctx.deletedWebhook = true;
          }

          const text = node.data.message || "Webhook deleted";

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to delete webhook.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Delete Webhook ─────────────────────────
client.fetchWebhook("${node.data.webhookId}")
  .then(webhook => webhook.delete())
  .then(() => {
    message.channel.send("🗑️ Webhook deleted");
  })
  .catch(() => {
    message.reply("❌ Failed to delete webhook.");
  });
`;
      }
    }
  }
};