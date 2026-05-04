'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_tempmute: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'tempmute').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await message.reply('❌ You do not have **Manage Roles** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [minutes] [reason]\``);
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

        const after    = message.content.slice(cmd.length).trim();
        const stripped = after.replace(/<@!?\d+>/g, '').trim();
        const parts    = stripped.split(/\s+/);
        const durMins  = parseInt(parts[0], 10) || node.data.duration || 10;
        const reason   = parts.slice(isNaN(parseInt(parts[0], 10)) ? 0 : 1).join(' ') || node.data.reason || 'No reason provided';

        const guildId  = message.guild.id;
        const userId   = target.id;
        const client   = message.client;

        try {
          await target.roles.add(muteRole, reason);
          await message.channel.send(
            `🔇 **${target.user.tag}** has been muted for **${durMins} minute(s)**.\n📋 Reason: ${reason}`
          );

          setTimeout(async () => {
            try {
              const guild  = client.guilds.cache.get(guildId);
              if (!guild) return;
              const member = await guild.members.fetch(userId).catch(() => null);
              if (!member) return;
              const role   = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
              if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Temp mute expired');
              }
            } catch { /* member left or role gone */ }
          }, durMins * 60 * 1000);

        } catch (err) {
          await message.reply('❌ Failed to temp-mute that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd  = (node.data.command || 'tempmute').replace(/"/g, '\\"');
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const durMins = node.data.duration || 10;
        const reason  = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Temp Mute ─────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageRoles")) {
    message.reply("❌ You do not have Manage Roles permission.");
  } else {
    const _t        = message.mentions.members?.first();
    const _muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [minutes] [reason]\\\`\`); }
    else if (!_muteRole) { message.reply("❌ No Muted role found."); }
    else {
      const _stripped = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim();
      const _parts = _stripped.split(/\\s+/);
      const _dur = parseInt(_parts[0],10) || ${durMins};
      const _r   = _parts.slice(isNaN(parseInt(_parts[0],10)) ? 0 : 1).join(" ") || "${reason}";
      const _uid = _t.id;
      _t.roles.add(_muteRole, _r).then(() => {
        message.channel.send(\`🔇 **\${_t.user.tag}** muted for **\${_dur} min(s)**.\\n📋 Reason: \${_r}\`);
        setTimeout(async () => {
          const _m = await message.guild.members.fetch(_uid).catch(()=>null);
          if (_m && _m.roles.cache.has(_muteRole.id)) _m.roles.remove(_muteRole).catch(()=>{});
        }, _dur * 60000);
      });
    }
  }
}`;
      },
    },
  },
};
