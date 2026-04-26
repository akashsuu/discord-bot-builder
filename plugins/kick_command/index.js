'use strict';

function applyTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    template
  );
}

module.exports = {
  nodes: {
    kick_command: {
      async execute(node, message) {
        const cmd = (node.data.command || '!kick').trim();
        if (!message.content.startsWith(cmd)) return false;

        if (!message.member || !message.member.permissions.has('KickMembers')) {
          await message.reply('❌ You do not have **Kick Members** permission.');
          return false;
        }

        const target = message.mentions.members
          ? message.mentions.members.first()
          : null;

        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }

        if (target.id === message.client.user.id) {
          await message.reply("❌ I can't kick myself.");
          return false;
        }

        if (!target.kickable) {
          await message.reply('❌ I cannot kick that user — they may have a higher role than me.');
          return false;
        }

        const afterCmd   = message.content.slice(cmd.length).trim();
        const reasonFromMsg = afterCmd.replace(/<@!?\d+>/, '').trim();
        const reason     = reasonFromMsg || node.data.reason || 'No reason provided';

        await target.kick(reason);

        // Use the editable output template
        const template = node.data.output || '✅ {target} has been kicked.\n📋 Reason: {reason}';
        const msg = applyTemplate(template, {
          target:  target.user.tag,
          reason,
          user:    message.author.username,
          command: cmd,
        });
        await message.channel.send(msg);
        return true;
      },

      generateCode(node) {
        const cmd    = (node.data.command || '!kick').replace(/"/g, '\\"');
        const reason = (node.data.reason  || 'No reason provided').replace(/"/g, '\\"');
        const tpl    = (node.data.output  || '✅ {target} has been kicked.\n📋 Reason: {reason}')
                         .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Kick Command ──────────────────────────────────
if (message.content.startsWith("${cmd}")) {
  if (!message.member || !message.member.permissions.has("KickMembers")) {
    message.reply("❌ You do not have Kick Members permission.");
  } else {
    const _kt = message.mentions.members ? message.mentions.members.first() : null;
    if (!_kt) {
      message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`);
    } else if (!_kt.kickable) {
      message.reply("❌ I cannot kick that user.");
    } else {
      const _ac = message.content.slice("${cmd}".length).trim();
      const _r  = _ac.replace(/<@!?\\d+>/, "").trim() || "${reason}";
      _kt.kick(_r).then(() => {
        const _tpl = \`${tpl}\`;
        message.channel.send(
          _tpl.replace(/\\{target\\}/g, _kt.user.tag)
              .replace(/\\{reason\\}/g, _r)
              .replace(/\\{user\\}/g,   message.author.username)
              .replace(/\\{command\\}/g,"${cmd}")
        );
      });
    }
  }
}
`;
      },
    },
  },
};
