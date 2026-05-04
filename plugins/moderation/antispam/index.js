'use strict';
const { PermissionFlagsBits } = require('discord.js');

// guildId → Set of enabled guilds
const enabledGuilds = new Set();
// guildId:userId → { count, timer }
const spamTracker   = new Map();

module.exports = {
  nodes: {
    mod_antispam: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix  = ctx?.prefix || '';
        const rawCmd  = (node.data.command || 'antispam').trim();
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
            await message.channel.send('🛡️ Anti-spam is now **enabled** in this server.');
          } else if (arg === 'off') {
            enabledGuilds.delete(message.guild.id);
            await message.channel.send('🛡️ Anti-spam is now **disabled** in this server.');
          } else {
            const state = enabledGuilds.has(message.guild.id) ? 'enabled' : 'disabled';
            await message.channel.send(`🛡️ Anti-spam is currently **${state}**. Use \`${cmd} on\` or \`${cmd} off\`.`);
          }
          return true;
        }

        // ── Passive filter ──
        if (!enabledGuilds.has(message.guild.id)) return false;

        const threshold = node.data.threshold || 5;
        const interval  = node.data.interval  || 5000;
        const key       = `${message.guild.id}:${message.author.id}`;

        let tracker = spamTracker.get(key);
        if (!tracker) {
          tracker = { count: 0, messages: [], timer: null };
          spamTracker.set(key, tracker);
        }

        tracker.count++;
        tracker.messages.push(message);

        if (tracker.timer) clearTimeout(tracker.timer);
        tracker.timer = setTimeout(() => {
          spamTracker.delete(key);
        }, interval);

        if (tracker.count >= threshold) {
          spamTracker.delete(key);
          // Delete tracked messages
          for (const msg of tracker.messages) {
            msg.delete().catch(() => {});
          }
          try {
            await message.channel.send(`⚠️ ${message.author} has been flagged for spam and their messages were removed.`);
          } catch { /* channel may have been deleted */ }
          return true;
        }

        return false;
      },

      generateCode(node, prefix = '') {
        const rawCmd   = (node.data.command || 'antispam').replace(/"/g, '\\"');
        const cmd      = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const threshold = node.data.threshold || 5;
        const interval  = node.data.interval  || 5000;
        return `
// ── Anti Spam ─────────────────────────────────
// Requires module-level: const antispamEnabled = new Set(); const spamTracker = new Map();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageGuild")) {
    message.reply("❌ You do not have Manage Server permission.");
  } else {
    const _arg = message.content.slice("${cmd}".length).trim().toLowerCase();
    if (_arg === "on")  { antispamEnabled.add(message.guild.id);    message.channel.send("🛡️ Anti-spam enabled."); }
    if (_arg === "off") { antispamEnabled.delete(message.guild.id); message.channel.send("🛡️ Anti-spam disabled."); }
  }
} else if (antispamEnabled.has(message.guild.id) && !message.author.bot) {
  const _k = \`\${message.guild.id}:\${message.author.id}\`;
  let _tr = spamTracker.get(_k) || { count: 0, messages: [] };
  _tr.count++; _tr.messages.push(message);
  spamTracker.set(_k, _tr);
  clearTimeout(_tr.timer);
  _tr.timer = setTimeout(() => spamTracker.delete(_k), ${interval});
  if (_tr.count >= ${threshold}) {
    spamTracker.delete(_k);
    _tr.messages.forEach(m => m.delete().catch(()=>{}));
    message.channel.send(\`⚠️ \${message.author} flagged for spam.\`);
  }
}`;
      },
    },
  },
};
