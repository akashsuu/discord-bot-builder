'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    create_invite: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;
        if (message.author.bot) return false;

        const guild = message.guild;

        // 🔹 Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          await message.reply("❌ You need **Create Invite** permission.");
          return false;
        }

        // 🔹 Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel || !channel.isTextBased()) {
          await message.reply("❌ Invalid channel.");
          return false;
        }

        // 🔹 Options
        const maxUses = parseInt(node.data.maxUses) || 0;
        const maxAge = parseInt(node.data.maxAge) || 0;
        const temporary = node.data.temporary === true || node.data.temporary === "true";
        const unique = node.data.unique === true || node.data.unique === "true";

        try {
          const invite = await channel.createInvite({
            maxUses,
            maxAge,
            temporary,
            unique
          });

          // 🔹 Save to context
          if (ctx) {
            ctx[node.data.saveAs || "invite"] = invite;
          }

          // 🔹 Output
          let text = node.data.output || "{url}";

          text = text
            .replace(/\{url\}/g, invite.url)
            .replace(/\{code\}/g, invite.code);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to create invite.");
          return false;
        }
      },

      generateCode(node) {
        return `
// ── Generate Invite ─────────────────────────
message.channel.createInvite({
  maxUses: ${parseInt(node.data.maxUses) || 0},
  maxAge: ${parseInt(node.data.maxAge) || 0}
}).then(invite => {
  message.channel.send(invite.url);
}).catch(() => {
  message.reply("❌ Failed to create invite.");
});
`;
      }
    }
  }
};