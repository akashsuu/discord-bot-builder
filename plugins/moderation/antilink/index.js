'use strict';
const { PermissionFlagsBits } = require('discord.js');

const enabledGuilds = new Set();
const URL_REGEX     = /https?:\/\/[^\s]+/i;

module.exports = {
  nodes: {
    mod_antilink: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix  = ctx?.prefix || '';
        const rawCmd  = (node.data.command || 'antilink').trim();
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const content = message.content;

        // ── Toggle command ──
        if (content.toLowerCase().startsWith(cmd.toLowerCase())) {
          if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            await message.reply('❌ You do not have **Manage Server** permission.');
            return false;
          }
          const arg = content.slice(cmd.length).trim().toLowerCase();
          if (arg === 'on') {
            enabledGuilds.add(message.guild.id);
            await message.channel.send('🔗 Anti-link is now **enabled** in this server.');
          } else if (arg === 'off') {
            enabledGuilds.delete(message.guild.id);
            await message.channel.send('🔗 Anti-link is now **disabled** in this server.');
          } else {
            const state = enabledGuilds.has(message.guild.id) ? 'enabled' : 'disabled';
            await message.channel.send(`🔗 Anti-link is currently **${state}**. Use \`${cmd} on\` or \`${cmd} off\`.`);
          }
          return true;
        }

        // ── Passive filter ──
        if (!enabledGuilds.has(message.guild.id)) return false;

        // Allow moderators to post links
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

        if (URL_REGEX.test(content)) {
          try {
            await message.delete();
            const warn = await message.channel.send(`🔗 ${message.author}, links are not allowed in this server.`);
            setTimeout(() => warn.delete().catch(() => {}), 5000);
            return true;
          } catch { /* message already deleted */ }
        }

        return false;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'antilink').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Anti Link ─────────────────────────────────
// Requires module-level: const antilinkEnabled = new Set();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageGuild")) {
    message.reply("❌ You do not have Manage Server permission.");
  } else {
    const _arg = message.content.slice("${cmd}".length).trim().toLowerCase();
    if (_arg === "on")  { antilinkEnabled.add(message.guild.id);    message.channel.send("🔗 Anti-link enabled."); }
    if (_arg === "off") { antilinkEnabled.delete(message.guild.id); message.channel.send("🔗 Anti-link disabled."); }
  }
} else if (antilinkEnabled.has(message.guild.id) && !message.author.bot && !message.member?.permissions.has("ManageMessages")) {
  if (/https?:\\/\\/[^\\s]+/i.test(message.content)) {
    message.delete().catch(()=>{});
    message.channel.send(\`🔗 \${message.author}, links are not allowed.\`)
      .then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
  }
}`;
      },
    },
  },
};
