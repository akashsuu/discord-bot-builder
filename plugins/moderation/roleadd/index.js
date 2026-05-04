'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_roleadd: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'roleadd').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await message.reply('❌ You do not have **Manage Roles** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        const role   = message.mentions.roles?.first();

        if (!target || !role) {
          await message.reply(`❌ Usage: \`${cmd} @user @role\``);
          return false;
        }

        if (target.roles.cache.has(role.id)) {
          await message.reply(`❌ **${target.user.tag}** already has the **${role.name}** role.`);
          return false;
        }

        const botMember = message.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
          await message.reply('❌ I cannot assign a role that is higher than or equal to my highest role.');
          return false;
        }

        try {
          await target.roles.add(role);
          await message.channel.send(`➕ Added role **${role.name}** to **${target.user.tag}**.`);
        } catch (err) {
          await message.reply('❌ Failed to add that role.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'roleadd').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Role Add ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageRoles")) {
    message.reply("❌ You do not have Manage Roles permission.");
  } else {
    const _t = message.mentions.members?.first();
    const _r = message.mentions.roles?.first();
    if (!_t || !_r) { message.reply(\`❌ Usage: \\\`${cmd} @user @role\\\`\`); }
    else {
      _t.roles.add(_r).then(() => message.channel.send(\`➕ Added **\${_r.name}** to **\${_t.user.tag}**.\`))
        .catch(() => message.reply("❌ Failed to add that role."));
    }
  }
}`;
      },
    },
  },
};
