'use strict';

module.exports = {
  nodes: {
    guild_logger: {
      async execute(node, eventData, ctx) {
        const guild = eventData;
        if (!guild || !guild.systemChannel) return false;

        const template = node.data.output || '🏰 Joined server **{server}** with {members} members!';
        const text = template
          .replace(/\{server\}/g,  guild.name)
          .replace(/\{members\}/g, guild.memberCount)
          .replace(/\{owner\}/g,   guild.ownerId || 'unknown');

        if (node.data.embedEnabled) {
          const embed = ctx.buildEmbed(node.data, text);
          await guild.systemChannel.send({ embeds: [embed] });
        } else {
          await guild.systemChannel.send(text);
        }
        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || '🏰 Joined server **{server}** with {members} members!')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Guild Logger ─────────────────────────────────────
const _gChan = guild.systemChannel;
if (_gChan) {
  const _msg = \`${tpl}\`
    .replace(/\\{server\\}/g,  guild.name)
    .replace(/\\{members\\}/g, guild.memberCount)
    .replace(/\\{owner\\}/g,   guild.ownerId || 'unknown');
  _gChan.send(_msg);
}
`;
      },
    },
  },
};
