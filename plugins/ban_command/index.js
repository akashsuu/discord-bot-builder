'use strict';

const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  nodes: {
    ban_command: {

      async execute(node, message) {
        // Ignore bots
        if (message.author.bot) return false;

        // Ignore DMs
        if (!message.guild) return false;

        const cmd = (node.data.command || "!ban").trim();

        // Command match
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) {
          return false;
        }

        // Permission check (user)
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply("❌ You do not have **Ban Members** permission.");
          return false;
        }

        // Get mentioned member
        const target = message.mentions.members
          ? message.mentions.members.first()
          : null;

        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }

        // Prevent banning yourself
        if (target.id === message.author.id) {
          await message.reply("❌ You cannot ban yourself.");
          return false;
        }

        // Prevent banning bot
        if (target.id === message.client.user.id) {
          await message.reply("❌ I can't ban myself.");
          return false;
        }

        // Check if bannable
        if (!target.bannable) {
          await message.reply("❌ I cannot ban that user (role too high?).");
          return false;
        }

        // Extract reason
        const afterCmd = message.content.slice(cmd.length).trim();
        const mentionPattern = /<@!?\d+>/;
        const reasonFromMsg = afterCmd.replace(mentionPattern, '').trim();
        const reason = reasonFromMsg || node.data.reason || "No reason provided";

        // Execute ban safely
        try {
          await target.ban({ reason });

          await message.channel.send(
            `🔨 **${target.user.tag}** has been banned.\n📋 Reason: ${reason}`
          );

        } catch (err) {
          await message.reply("❌ Failed to ban user.");
          return false;
        }

        return true;
      },

      generateCode(node) {
        const cmd = (node.data.command || "!ban").replace(/"/g, '\\"');
        const reason = (node.data.reason || "No reason provided").replace(/"/g, '\\"');

        return `
// ── Ban Command ──────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member.permissions.has("BanMembers")) {
    message.reply("❌ You do not have Ban Members permission.");
  } else {
    const target = message.mentions.members ? message.mentions.members.first() : null;

    if (!target) {
      message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`);
    } else if (!target.bannable) {
      message.reply("❌ I cannot ban that user.");
    } else {
      const afterCmd = message.content.slice("${cmd}".length).trim();
      const reason = afterCmd.replace(/<@!?\\d+>/, "").trim() || "${reason}";

      target.ban({ reason }).then(() => {
        message.channel.send(\`🔨 **\${target.user.tag}** has been banned.\\n📋 Reason: \${reason}\`);
      });
    }
  }
}
`;
      }
    }
  }
};