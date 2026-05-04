'use strict';
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  nodes: {
    mod_nickname: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'nickname').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
          await message.reply('❌ You do not have **Manage Nicknames** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user <new nickname>\``);
          return false;
        }

        const after    = message.content.slice(cmd.length).trim();
        const newNick  = after.replace(/<@!?\d+>/g, '').trim();

        if (!newNick) {
          await message.reply(`❌ Usage: \`${cmd} @user <new nickname>\``);
          return false;
        }

        if (newNick.length > 32) {
          await message.reply('❌ Nickname cannot be longer than 32 characters.');
          return false;
        }

        try {
          await target.setNickname(newNick);
          await message.channel.send(`✏️ Set **${target.user.tag}**'s nickname to **${newNick}**.`);
        } catch (err) {
          await message.reply('❌ Failed to change that nickname.');
          return false;
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'nickname').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Nickname ──────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("ManageNicknames")) {
    message.reply("❌ You do not have Manage Nicknames permission.");
  } else {
    const _t = message.mentions.members?.first();
    const _n = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim();
    if (!_t || !_n) { message.reply(\`❌ Usage: \\\`${cmd} @user <nickname>\\\`\`); }
    else {
      _t.setNickname(_n).then(() => message.channel.send(\`✏️ Set **\${_t.user.tag}**'s nickname to **\${_n}**.\`))
        .catch(() => message.reply("❌ Failed to change nickname."));
    }
  }
}`;
      },
    },
  },
};
