'use strict';

module.exports = {
  nodes: {
    welcome_member: {
      async execute(node, eventData, ctx) {
        const member = eventData;
        if (!member || !member.guild) return false;

        const channel = member.guild.systemChannel;
        if (!channel) return false;

        const template = node.data.output || '👋 Welcome **{member}** to the server! You are member #{count}.';
        const text = template
          .replace(/\{member\}/g, member.user.username)
          .replace(/\{tag\}/g,    member.user.tag)
          .replace(/\{count\}/g,  member.guild.memberCount);

        if (node.data.embedEnabled) {
          const embed = ctx.buildEmbed(node.data, text);
          await channel.send({ embeds: [embed] });
        } else {
          await channel.send(text);
        }
        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || '👋 Welcome **{member}** to the server! You are member #{count}.')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Welcome Member ───────────────────────────────────
const _welChan = member.guild?.systemChannel;
if (_welChan) {
  const _msg = \`${tpl}\`
    .replace(/\\{member\\}/g, member.user.username)
    .replace(/\\{tag\\}/g,    member.user.tag)
    .replace(/\\{count\\}/g,  member.guild.memberCount);
  _welChan.send(_msg);
}
`;
      },
    },
  },
};
