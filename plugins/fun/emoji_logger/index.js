'use strict';

module.exports = {
  nodes: {
    emoji_logger: {
      async execute(node, eventData, ctx) {
        const emoji = eventData;
        if (!emoji || !emoji.guild) return false;

        const channel = emoji.guild.systemChannel;
        if (!channel) return false;

        const template = node.data.output || '😀 Emoji **{emoji}** was added to the server!';
        const text = template
          .replace(/\{emoji\}/g, emoji.name || 'unknown')
          .replace(/\{server\}/g, emoji.guild.name);

        if (node.data.embedEnabled) {
          const embed = ctx.buildEmbed(node.data, text);
          await channel.send({ embeds: [embed] });
        } else {
          await channel.send(text);
        }
        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || '😀 Emoji **{emoji}** was added to the server!')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Emoji Logger ─────────────────────────────────────
const _eChan = emoji.guild?.systemChannel;
if (_eChan) {
  const _msg = \`${tpl}\`
    .replace(/\\{emoji\\}/g,  emoji.name || 'unknown')
    .replace(/\\{server\\}/g, emoji.guild.name);
  _eChan.send(_msg);
}
`;
      },
    },
  },
};
