'use strict';

module.exports = {
  nodes: {
    fetch_invite: {

      async execute(node, message, ctx) {
        if (!message.client) return false;

        let inviteInput = node.data.invite;

        // Fallback: extract from message
        if (!inviteInput) {
          const match = message.content.match(/discord\.gg\/([a-zA-Z0-9]+)/);
          if (match) inviteInput = match[1];
        }

        if (!inviteInput) {
          await message.reply("❌ No invite provided.");
          return false;
        }

        // Extract code if full URL
        const code = inviteInput.replace(/https?:\/\/discord\.gg\//, "");

        try {
          const invite = await message.client.fetchInvite(code);

          // Save to context
          if (ctx) {
            ctx[node.data.saveAs || "inviteData"] = invite;
          }

          let text = node.data.output || "Invite: {code}";

          text = text
            .replace(/\{code\}/g, invite.code)
            .replace(/\{uses\}/g, invite.uses ?? "unknown")
            .replace(/\{channel\}/g, invite.channel?.name || "unknown")
            .replace(/\{guild\}/g, invite.guild?.name || "unknown");

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to fetch invite.");
          return false;
        }
      },

      generateCode(node) {
        const tpl = (node.data.output || "Invite: {code}")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Fetch Invite ─────────────────────────
const code = "${node.data.invite}".replace(/https?:\\/\\/discord\\.gg\\//, "");

client.fetchInvite(code)
  .then(invite => {
    const msg = \`${tpl}\`
      .replace(/\\{code\\}/g, invite.code)
      .replace(/\\{uses\\}/g, invite.uses ?? "unknown")
      .replace(/\\{channel\\}/g, invite.channel?.name || "unknown")
      .replace(/\\{guild\\}/g, invite.guild?.name || "unknown");

    message.channel.send(msg);
  })
  .catch(() => {
    message.reply("❌ Failed to fetch invite.");
  });
`;
      }
    }
  }
};