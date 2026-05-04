'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_purge: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'purge').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
          await message.reply('❌ You do not have **Manage Messages** permission.');
          return false;
        }

        const args   = message.content.slice(cmd.length).trim().split(/\s+/);
        const amount = parseInt(args[0], 10);

        if (isNaN(amount) || amount < 1 || amount > 100) {
          await message.reply(`❌ Usage: \`${cmd} <1-100>\``);
          return false;
        }

        try {
          const deleted = await message.channel.bulkDelete(amount, true);
          const reply   = await message.channel.send(`💨 Purged **${deleted.size}** message(s).`);
          setTimeout(() => reply.delete().catch(() => {}), 4000);
        } catch (err) {
          await message.reply('❌ Failed to purge messages. Messages older than 14 days cannot be bulk-deleted.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'purge').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Purge ─────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageMessages")) {
    message.reply("❌ You do not have Manage Messages permission.");
  } else {
    const _n = parseInt(message.content.slice("${cmd}".length).trim(), 10);
    if (isNaN(_n) || _n < 1 || _n > 100) { message.reply("❌ Usage: \`${cmd} <1-100>\`"); }
    else {
      message.channel.bulkDelete(_n, true).then(d => {
        message.channel.send(\`💨 Purged **\${d.size}** message(s).\`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
      }).catch(() => message.reply("❌ Failed to purge messages."));
    }
  }
}`;
      },
    },
  },
};
