'use strict';
const { PermissionFlagsBits } = require('discord.js');

// Shared warnings store — same Map used by mod_warn
// In production these should be imported from a shared module.
const warnings = new Map();

module.exports = {
  nodes: {
    mod_warnings: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'warnings').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await message.reply('❌ You do not have **Moderate Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first() || message.mentions.users?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user\``);
          return false;
        }

        const userId = target.id || target.user?.id;
        const key    = `${message.guild.id}:${userId}`;
        const list   = warnings.get(key) || [];

        if (list.length === 0) {
          await message.channel.send(`📋 **${target.user?.tag || target.tag}** has no warnings.`);
          return true;
        }

        const lines = list.map((w, i) =>
          `**#${i + 1}** — ${w.reason} *(${w.date ? new Date(w.date).toLocaleDateString() : 'unknown date'})*`
        ).join('\n');

        await message.channel.send(
          `📋 Warnings for **${target.user?.tag || target.tag}** (${list.length} total):\n${lines}`
        );
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'warnings').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Warnings ──────────────────────────────────
// Requires a module-level: const warnings = new Map();
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ModerateMembers")) {
    message.reply("❌ You do not have Moderate Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user\\\`\`); }
    else {
      const _key  = \`\${message.guild.id}:\${_t.id}\`;
      const _list = warnings.get(_key) || [];
      if (_list.length === 0) {
        message.channel.send(\`📋 **\${_t.user.tag}** has no warnings.\`);
      } else {
        const _lines = _list.map((w,i) => \`**#\${i+1}** — \${w.reason}\`).join("\\n");
        message.channel.send(\`📋 Warnings for **\${_t.user.tag}** (\${_list.length} total):\\n\${_lines}\`);
      }
    }
  }
}`;
      },
    },
  },
};
