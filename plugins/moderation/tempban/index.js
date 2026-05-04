'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_tempban: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'tempban').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('❌ You do not have **Ban Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [minutes] [reason]\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot temp-ban yourself.');
          return false;
        }
        if (!target.bannable) {
          await message.reply('❌ I cannot ban that user (role too high?).');
          return false;
        }

        const after    = message.content.slice(cmd.length).trim();
        const stripped = after.replace(/<@!?\d+>/g, '').trim();
        const parts    = stripped.split(/\s+/);
        const durMins  = parseInt(parts[0], 10) || node.data.duration || 60;
        const reason   = parts.slice(isNaN(parseInt(parts[0], 10)) ? 0 : 1).join(' ') || node.data.reason || 'No reason provided';

        const guildId  = message.guild.id;
        const userId   = target.id;
        const client   = message.client;

        try {
          await target.ban({ reason: `[Temp ${durMins}m] ${reason}` });
          await message.channel.send(
            `⏳ **${target.user.tag}** has been temp-banned for **${durMins} minute(s)**.\n📋 Reason: ${reason}`
          );

          setTimeout(async () => {
            try {
              const guild = client.guilds.cache.get(guildId);
              if (guild) {
                await guild.members.unban(userId, 'Temp ban expired');
              }
            } catch { /* already unbanned or guild gone */ }
          }, durMins * 60 * 1000);

        } catch (err) {
          await message.reply('❌ Failed to temp-ban that user.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd  = (node.data.command || 'tempban').replace(/"/g, '\\"');
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const durMins = node.data.duration || 60;
        const reason  = (node.data.reason || 'No reason provided').replace(/"/g, '\\"');
        return `
// ── Temp Ban ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("BanMembers")) {
    message.reply("❌ You do not have Ban Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) { message.reply(\`❌ Usage: \\\`${cmd} @user [minutes] [reason]\\\`\`); }
    else if (!_t.bannable) { message.reply("❌ I cannot ban that user."); }
    else {
      const _stripped = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim();
      const _parts = _stripped.split(/\\s+/);
      const _dur = parseInt(_parts[0], 10) || ${durMins};
      const _r   = _parts.slice(isNaN(parseInt(_parts[0],10)) ? 0 : 1).join(" ") || "${reason}";
      const _uid = _t.id;
      _t.ban({ reason: \`[Temp \${_dur}m] \${_r}\` }).then(() => {
        message.channel.send(\`⏳ **\${_t.user.tag}** temp-banned for **\${_dur} min(s)**.\\n📋 Reason: \${_r}\`);
        setTimeout(() => message.guild.members.unban(_uid, "Temp ban expired").catch(()=>{}), _dur * 60000);
      });
    }
  }
}`;
      },
    },
  },
};
