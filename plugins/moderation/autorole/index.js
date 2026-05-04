'use strict';
const { PermissionFlagsBits } = require('discord.js');

// guildId → roleId
const autoRoles = new Map();

module.exports = {
  nodes: {
    mod_autorole: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'autorole').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await message.reply('❌ You do not have **Manage Roles** permission.');
          return false;
        }

        const after = message.content.slice(cmd.length).trim();
        const role  = message.mentions.roles?.first();

        if (after.toLowerCase() === 'off' || after.toLowerCase() === 'disable') {
          autoRoles.delete(message.guild.id);
          await message.channel.send('🎭 Auto-role has been **disabled**.');
          return true;
        }

        if (!role) {
          const current = autoRoles.get(message.guild.id);
          if (current) {
            const r = message.guild.roles.cache.get(current);
            await message.channel.send(`🎭 Auto-role is set to **${r ? r.name : `<deleted: ${current}>`}**. Use \`${cmd} @role\` to change or \`${cmd} off\` to disable.`);
          } else {
            await message.channel.send(`🎭 No auto-role set. Use \`${cmd} @role\` to configure one.`);
          }
          return true;
        }

        const botMember = message.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
          await message.reply('❌ I cannot assign a role that is higher than or equal to my highest role.');
          return false;
        }

        autoRoles.set(message.guild.id, role.id);
        await message.channel.send(
          `🎭 Auto-role set to **${role.name}**. New members will automatically receive this role when they join.\n⚠️ Note: This requires connecting to the \`guildMemberAdd\` event in your bot.`
        );
        return true;
      },

      // Helper exposed for runtime integration
      onMemberAdd(guildId, member) {
        const roleId = autoRoles.get(guildId);
        if (!roleId) return;
        const role = member.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'autorole').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Auto Role ─────────────────────────────────
// Requires module-level: const autoRoles = new Map();
// For guildMemberAdd: const _ar = autoRoles.get(member.guild.id); if (_ar) member.roles.add(_ar).catch(()=>{});
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageRoles")) {
    message.reply("❌ You do not have Manage Roles permission.");
  } else {
    const _role = message.mentions.roles?.first();
    const _arg  = message.content.slice("${cmd}".length).trim().toLowerCase();
    if (_arg === "off") {
      autoRoles.delete(message.guild.id);
      message.channel.send("🎭 Auto-role disabled.");
    } else if (_role) {
      autoRoles.set(message.guild.id, _role.id);
      message.channel.send(\`🎭 Auto-role set to **\${_role.name}**.\`);
    } else {
      message.channel.send(\`❌ Usage: \\\`${cmd} @role\\\` or \\\`${cmd} off\\\`\`);
    }
  }
}`;
      },
    },
  },
};
