'use strict';

module.exports = {
  nodes: {
    mod_report: {
      async execute(node, message, ctx) {
        if (message.author.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data.command || 'report').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user <reason>\``);
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('❌ You cannot report yourself.');
          return false;
        }

        const after  = message.content.slice(cmd.length).trim();
        const reason = after.replace(/<@!?\d+>/g, '').trim();

        if (!reason) {
          await message.reply(`❌ Please provide a reason. Usage: \`${cmd} @user <reason>\``);
          return false;
        }

        const reportChannel = message.guild.systemChannel;
        const embed = {
          title: '🚨 New Report',
          color: 0xC0392B,
          fields: [
            { name: 'Reported User', value: `${target.user.tag} (${target.id})`, inline: true },
            { name: 'Reported By',   value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: 'Channel',       value: message.channel.toString(), inline: true },
            { name: 'Reason',        value: reason },
          ],
          timestamp: new Date().toISOString(),
        };

        if (reportChannel) {
          await reportChannel.send({ embeds: [embed] });
          await message.reply('✅ Your report has been submitted to the moderation team.');
        } else {
          // DM the guild owner as fallback
          try {
            const owner = await message.guild.fetchOwner();
            await owner.send({ embeds: [embed] });
            await message.reply('✅ Your report has been submitted to the server owner.');
          } catch {
            await message.reply('✅ Your report has been logged. (No system channel configured.)');
          }
        }

        // Delete the command message for reporter anonymity
        message.delete().catch(() => {});
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data.command || 'report').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        return `
// ── Report ────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _t = message.mentions.members?.first();
  const _r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g,"").trim();
  if (!_t || !_r) { message.reply(\`❌ Usage: \\\`${cmd} @user <reason>\\\`\`); }
  else {
    const _ch = message.guild.systemChannel;
    const _embed = {
      title: "🚨 New Report",
      color: 0xC0392B,
      fields: [
        { name: "Reported User", value: \`\${_t.user.tag} (\${_t.id})\`, inline: true },
        { name: "Reported By",   value: \`\${message.author.tag}\`,      inline: true },
        { name: "Reason",        value: _r },
      ],
      timestamp: new Date().toISOString(),
    };
    if (_ch) {
      _ch.send({ embeds: [_embed] }).then(() => message.reply("✅ Report submitted."));
    } else {
      message.reply("✅ Report logged.");
    }
    message.delete().catch(()=>{});
  }
}`;
      },
    },
  },
};
