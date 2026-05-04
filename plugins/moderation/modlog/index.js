'use strict';
const { PermissionFlagsBits } = require('discord.js');

// guildId → channelId
const modlogChannels = new Map();

module.exports = {
  nodes: {
    mod_modlog: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'modlog').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply('❌ You do not have **Manage Server** permission.');
          return false;
        }

        const after   = message.content.slice(cmd.length).trim();
        const channel = message.mentions.channels?.first();

        if (after.toLowerCase() === 'off') {
          modlogChannels.delete(message.guild.id);
          await message.channel.send('📝 Mod-log has been **disabled**.');
          return true;
        }

        if (!channel) {
          const current = modlogChannels.get(message.guild.id);
          if (current) {
            await message.channel.send(`📝 Mod-log is set to <#${current}>. Use \`${cmd} #channel\` to change or \`${cmd} off\` to disable.`);
          } else {
            await message.channel.send(`📝 No mod-log channel set. Use \`${cmd} #channel\` to configure.`);
          }
          return true;
        }

        modlogChannels.set(message.guild.id, channel.id);
        await message.channel.send(`📝 Mod-log channel set to ${channel}.`);

        // Send a test log entry
        await channel.send({
          embeds: [{
            title: '📝 Mod Log Configured',
            description: `Moderation actions will be logged here.`,
            color: 0xC0392B,
            fields: [
              { name: 'Configured By', value: message.author.tag, inline: true },
              { name: 'Channel',       value: channel.toString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
          }]
        });

        return true;
      },

      // Helper for other plugins to log to the modlog channel
      async log(guild, embed) {
        const channelId = modlogChannels.get(guild.id);
        if (!channelId) return;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        await channel.send({ embeds: [embed] }).catch(() => {});
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'modlog').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Mod Log ───────────────────────────────────
// Requires module-level: const modlogChannels = new Map();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageGuild")) {
    message.reply("❌ You do not have Manage Server permission.");
  } else {
    const _ch  = message.mentions.channels?.first();
    const _arg = message.content.slice("${cmd}".length).trim().toLowerCase();
    if (_arg === "off") {
      modlogChannels.delete(message.guild.id);
      message.channel.send("📝 Mod-log disabled.");
    } else if (_ch) {
      modlogChannels.set(message.guild.id, _ch.id);
      message.channel.send(\`📝 Mod-log set to \${_ch}.\`);
    } else {
      message.channel.send(\`❌ Usage: \\\`${cmd} #channel\\\` or \\\`${cmd} off\\\`\`);
    }
  }
}`;
      },
    },
  },
};
