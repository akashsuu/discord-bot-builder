'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_unmute: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'unmute').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await message.reply('❌ You do not have **Manage Roles** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user\``);
          return false;
        }

        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!muteRole) {
          await message.reply('❌ No role named **Muted** found.');
          return false;
        }

        if (!target.roles.cache.has(muteRole.id)) {
          await message.reply(`❌ **${target.user.tag}** is not muted.`);
          return false;
        }

        try {
          await target.roles.remove(muteRole, 'Unmuted by moderator');
          await message.channel.send(`🔊 **${target.user.tag}** has been unmuted.`);
        } catch (err) {
          await message.reply('❌ Failed to unmute that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'unmute').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Unmute ────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageRoles")) {
    message.reply("❌ You do not have Manage Roles permission.");
  } else {
    const _t = message.mentions.members?.first();
    const _muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user\\\`\`); }
    else if (!_muteRole) { message.reply("❌ No Muted role found."); }
    else {
      _t.roles.remove(_muteRole).then(() => message.channel.send(\`🔊 **\${_t.user.tag}** has been unmuted.\`));
    }
  }
}`;
      },
    },
  },
};
