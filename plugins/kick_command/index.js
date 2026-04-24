'use strict';

module.exports = {
  nodes: {
    kick_command: {
      /**
       * execute() — called by botRunner on every messageCreate event.
       *
       * node    → the node object from the graph  (node.data has your fields)
       * message → a discord.js Message object
       *
       * return true  → downstream nodes will run
       * return false → stop this execution path
       */
      async execute(node, message) {
        const cmd = (node.data.command || '!kick').trim();

        // Only react to messages that start with the command
        if (!message.content.startsWith(cmd)) return false;

        // Check if the invoking user has permission to kick
        if (!message.member || !message.member.permissions.has('KickMembers')) {
          await message.reply('❌ You do not have **Kick Members** permission.');
          return false;
        }

        // Get the first mentioned member
        const target = message.mentions.members
          ? message.mentions.members.first()
          : null;

        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }

        // Prevent kicking the bot itself
        if (target.id === message.client.user.id) {
          await message.reply("❌ I can't kick myself.");
          return false;
        }

        // Check if the bot can actually kick this member
        if (!target.kickable) {
          await message.reply('❌ I cannot kick that user — they may have a higher role than me.');
          return false;
        }

        // Parse reason: everything after the command word and the @mention
        const afterCmd = message.content.slice(cmd.length).trim();
        const mentionPattern = /<@!?\d+>/;
        const reasonFromMsg = afterCmd.replace(mentionPattern, '').trim();
        const reason = reasonFromMsg || node.data.reason || 'No reason provided';

        await target.kick(reason);
        await message.channel.send(
          `✅ **${target.user.tag}** has been kicked.\n📋 Reason: ${reason}`
        );

        return true; // continue to downstream nodes if any
      },

      /**
       * generateCode() — called by codeExporter when user exports bot.js.
       * Must return a valid JS string that runs inside the messageCreate handler.
       */
      generateCode(node) {
        const cmd    = (node.data.command || '!kick').replace(/"/g, '\\"');
        const reason = (node.data.reason  || 'No reason provided').replace(/"/g, '\\"');

        return `
// ── Kick Command (plugin) ──────────────────────────────
if (message.content.startsWith("${cmd}")) {
  if (!message.member || !message.member.permissions.has("KickMembers")) {
    message.reply("❌ You do not have Kick Members permission.");
  } else {
    const target = message.mentions.members ? message.mentions.members.first() : null;
    if (!target) {
      message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`);
    } else if (!target.kickable) {
      message.reply("❌ I cannot kick that user.");
    } else {
      const afterCmd = message.content.slice("${cmd}".length).trim();
      const reason = afterCmd.replace(/<@!?\\d+>/, "").trim() || "${reason}";
      target.kick(reason).then(() => {
        message.channel.send(\`✅ **\${target.user.tag}** has been kicked.\\n📋 Reason: \${reason}\`);
      });
    }
  }
}
`;
      },
    },
  },
};
