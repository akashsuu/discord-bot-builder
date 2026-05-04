'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_massban: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'massban').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('❌ You do not have **Ban Members** permission.');
          return false;
        }

        const targets = message.mentions.members;
        if (!targets || targets.size === 0) {
          await message.reply(`❌ Usage: \`${cmd} @user1 @user2 ... [reason]\``);
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim() || node.data.reason || 'Mass ban';

        const results = { banned: [], failed: [] };

        for (const [, member] of targets) {
          if (member.id === message.author.id || member.id === message.client.user.id) continue;
          if (!member.bannable) {
            results.failed.push(member.user.tag);
            continue;
          }
          try {
            await member.ban({ reason });
            results.banned.push(member.user.tag);
          } catch {
            results.failed.push(member.user.tag);
          }
        }

        let response = `🔨 Mass ban complete.\n✅ Banned: ${results.banned.length > 0 ? results.banned.join(', ') : 'none'}`;
        if (results.failed.length > 0) response += `\n❌ Failed: ${results.failed.join(', ')}`;
        response += `\n📋 Reason: ${reason}`;

        await message.channel.send(response);
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'massban').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data.reason || 'Mass ban').replace(/"/g, '\\"');
        return `
// ── Mass Ban ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("BanMembers")) {
    message.reply("❌ You do not have Ban Members permission.");
  } else {
    const _targets = message.mentions.members;
    if (!_targets || _targets.size === 0) { message.reply(\`❌ Usage: \\\`${cmd} @user1 @user2...\\\`\`); }
    else {
      const _r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim() || "${reason}";
      const _promises = _targets.filter(m => m.bannable).map(m => m.ban({ reason: _r }));
      Promise.allSettled(_promises).then(res => {
        const _ok = res.filter(r => r.status === "fulfilled").length;
        message.channel.send(\`🔨 Banned **\${_ok}** member(s).\\n📋 Reason: \${_r}\`);
      });
    }
  }
}`;
      },
    },
  },
};
