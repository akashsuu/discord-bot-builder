'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    set_name: {

      async execute(node, message, ctx) {
        if (!message) return false;
        if (message.author.bot) return false;

        const mode = (node.data.mode || "channel").toLowerCase();
        let name = node.data.name || "new-name";

        // 🔹 Dynamic variables
        name = name
          .replace(/\{user\}/g, message.author.username)
          .replace(/\{channel\}/g, message.channel?.name || "channel");

        try {
          if (mode === "channel") {
            if (!message.guild) return false;

            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
              await message.reply("❌ Missing Manage Channels permission.");
              return false;
            }

            const channel =
              (ctx && ctx.channel) ||
              message.channel;

            if (!channel) return false;

            await channel.setName(name);

            if (ctx) ctx.updatedChannel = channel;

          } else if (mode === "user") {
            if (!message.guild) return false;

            if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
              await message.reply("❌ Missing Manage Nicknames permission.");
              return false;
            }

            const member = message.mentions.members.first() || message.member;

            if (!member) return false;

            await member.setNickname(name);

            if (ctx) ctx.updatedUser = member;
          }

          // 🔹 Output message
          let text = node.data.message || "Name updated";

          text = text.replace(/\{name\}/g, name);

          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }

          return true;

        } catch (err) {
          await message.reply("❌ Failed to update name.");
          return false;
        }
      },

      generateCode(node) {
        const name = (node.data.name || "new-name")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Set Name ─────────────────────────
const name = \`${name}\`;

message.channel.setName(name)
  .then(() => {
    message.channel.send(\`✏️ Updated name to **\${name}**\`);
  })
  .catch(() => {
    message.reply("❌ Failed to update name.");
  });
`;
      }
    }
  }
};