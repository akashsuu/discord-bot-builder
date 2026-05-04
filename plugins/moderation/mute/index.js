'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_mute: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'mute').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await message.reply('❌ You do not have **Manage Roles** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }

        const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
        if (!muteRole) {
          await message.reply('❌ No role named **Muted** found. Please create one first.');
          return false;
        }

        if (target.roles.cache.has(muteRole.id)) {
          await message.reply(`❌ **${target.user.tag}** is already muted.`);
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim() || node.data.reason || 'No reason provided';

        try {
          await target.roles.add(muteRole, reason);
          await message.channel.send(`🔇 **${target.user.tag}** has been muted.\n📋 Reason: ${reason}`);
        } catch (err) {
          await message.reply('❌ Failed to mute that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'mute').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Mute ──────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageRoles")) {
    message.reply("❌ You do not have Manage Roles permission.");
  } else {
    const _t = message.mentions.members?.first();
    const _muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`); }
    else if (!_muteRole) { message.reply("❌ No Muted role found."); }
    else {
      const _r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").trim() || "${reason}";
      _t.roles.add(_muteRole, _r).then(() => message.channel.send(\`🔇 **\${_t.user.tag}** has been muted.\\n📋 Reason: \${_r}\`));
    }
  }
}`;
      },
    },
  },
};
