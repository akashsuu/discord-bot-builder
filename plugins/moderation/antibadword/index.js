'use strict';
const { PermissionFlagsBits } = require('discord.js');

const enabledGuilds = new Set();

module.exports = {
  nodes: {
    mod_antibadword: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix  = ctx?.prefix || '';
        const rawCmd  = (node.data.command || 'antibadword').trim();
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
            await message.channel.send('🤬 Anti-bad-word filter is now **enabled** in this server.');
          } else if (arg === 'off') {
            enabledGuilds.delete(message.guild.id);
            await message.channel.send('🤬 Anti-bad-word filter is now **disabled** in this server.');
          } else {
            const state = enabledGuilds.has(message.guild.id) ? 'enabled' : 'disabled';
            await message.channel.send(`🤬 Anti-bad-word is currently **${state}**. Use \`${cmd} on\` or \`${cmd} off\`.`);
          }
          return true;
        }

        // ── Passive filter ──
        if (!enabledGuilds.has(message.guild.id)) return false;

        // Allow moderators to bypass
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

        const wordsRaw = node.data.words || '';
        if (!wordsRaw.trim()) return false;

        const badWords    = wordsRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
        const lowerContent = content.toLowerCase();

        const found = badWords.some(word => lowerContent.includes(word));
        if (found) {
          try {
            await message.delete();
            const warn = await message.channel.send(`🤬 ${message.author}, that language is not allowed here.`);
            setTimeout(() => warn.delete().catch(() => {}), 5000);
            return true;
          } catch { /* message already deleted */ }
        }

        return false;
      },

      generateCode(node, prefix = '') {
        const rawCmd  = (node.data.command || 'antibadword').replace(/"/g, '\\"');
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const words   = (node.data.words || '').replace(/"/g, '\\"');
        return `
// ── Anti Bad Word ─────────────────────────────
// Requires module-level: const antibadwordEnabled = new Set();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageGuild")) {
    message.reply("❌ You do not have Manage Server permission.");
  } else {
    const _arg = message.content.slice("${cmd}".length).trim().toLowerCase();
    if (_arg === "on")  { antibadwordEnabled.add(message.guild.id);    message.channel.send("🤬 Anti-bad-word enabled."); }
    if (_arg === "off") { antibadwordEnabled.delete(message.guild.id); message.channel.send("🤬 Anti-bad-word disabled."); }
  }
} else if (antibadwordEnabled.has(message.guild.id) && !message.author.bot && !message.member?.permissions.has("ManageMessages")) {
  const _words = "${words}".split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
  const _lower = message.content.toLowerCase();
  if (_words.some(w => _lower.includes(w))) {
    message.delete().catch(()=>{});
    message.channel.send(\`🤬 \${message.author}, that language is not allowed.\`)
      .then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
  }
}`;
      },
    },
  },
};
