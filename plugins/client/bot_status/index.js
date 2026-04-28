'use strict';

module.exports = {
  nodes: {
    bot_status: {
      async execute(node, eventData, ctx) {
        // eventData is the Discord Client on 'ready', a string on 'warn'
        const client = typeof eventData === 'object' ? eventData : null;
        if (!client || !client.guilds) return false;

        const guild = client.guilds.cache.first();
        if (!guild) return false;

        const channel = guild.systemChannel;
        if (!channel) return false;

        const template = node.data.output || '🟢 Bot is now online and ready!';
        const text = template
          .replace(/\{bot\}/g,   client.user?.username || 'Bot')
          .replace(/\{guilds\}/g, client.guilds.cache.size);

        if (node.data.embedEnabled) {
          const embed = ctx.buildEmbed(node.data, text);
          await channel.send({ embeds: [embed] });
        } else {
          await channel.send(text);
        }
        return true;
      },

      generateCode(node) {
        const tpl = (node.data.output || '🟢 Bot is now online and ready!')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Bot Status ───────────────────────────────────────
client.once('ready', () => {
  const _g = client.guilds.cache.first();
  const _c = _g?.systemChannel;
  if (_c) {
    const _msg = \`${tpl}\`
      .replace(/\\{bot\\}/g,    client.user.username)
      .replace(/\\{guilds\\}/g, client.guilds.cache.size);
    _c.send(_msg);
  }
});
`;
      },
    },
  },
};
