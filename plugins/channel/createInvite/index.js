'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    create_invite: {

      async execute(node, message, ctx) {
        if (!message.guild) return false;

        // Ignore bots
        if (message.author.bot) return false;

        const guild = message.guild;

        // Permission check
        if (!message.member.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          await message.reply("❌ You need **Create Invite** permission.");
          return false;
        }

        // Get channel
        const channelId = node.data.channelId || message.channel.id;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
          await message.reply("❌ Channel not found.");
          return false;
        }

        // Invite options
        const maxUses = parseInt(node.data.maxUses) || 0;
        const maxAge = parseInt(node.data.maxAge) || 0;
        const temporary = node.data.temporary === true || node.data.temporary === "true";

        try {
          const invite = await channel.createInvite({
            maxUses,
            maxAge,
            temporary
          });

          const inviteURL = invite.url;

          // Save to context
          if (ctx) {
            ctx.invite = inviteURL;
          }

          let text = node.data.output || "Invite created: {invite}";
          text = text.replace(/\{invite\}/g, inviteURL);

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
        const tpl = (node.data.output || "Invite created: {invite}")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        const maxUses = parseInt(node.data.maxUses) || 0;
        const maxAge = parseInt(node.data.maxAge) || 0;
        const temporary = node.data.temporary === true || node.data.temporary === "true";

        return `
// ── Create Invite ─────────────────────────────
const channel = message.channel;

channel.createInvite({
  maxUses: ${maxUses},
  maxAge: ${maxAge},
  temporary: ${temporary}
}).then(invite => {
  const url = invite.url;

  message.channel.send(
    \`${tpl}\`.replace(/\\{invite\\}/g, url)
  );
}).catch(() => {
  message.reply("❌ Failed to create invite.");
});
`;
      }
    }
  }
};