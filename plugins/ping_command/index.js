'use strict';

module.exports = {
  nodes: {
    ping_command: {
      async execute(node, message) {
        const cmd = (node.data.command || '!ping').trim();
        if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

        const latency = Date.now() - message.createdTimestamp;

        const template = node.data.output || '🏓 Pong! Latency: {latency}ms';
        const msg = template
          .replace(/\{latency\}/g, latency)
          .replace(/\{command\}/g, cmd)
          .replace(/\{user\}/g, message.author.username);

        await message.channel.send(msg);
        return true;
      },

      generateCode(node) {
        const cmd = (node.data.command || '!ping').replace(/"/g, '\\"');
        const tpl = (node.data.output || '🏓 Pong! Latency: {latency}ms')
                      .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// ── Ping Command ──────────────────────────────────
if (message.content.trim().toLowerCase() === "${cmd}".toLowerCase()) {
  const _lat = Date.now() - message.createdTimestamp;
  const _tpl = \`${tpl}\`;
  message.channel.send(
    _tpl.replace(/\\{latency\\}/g, _lat)
        .replace(/\\{command\\}/g,  "${cmd}")
        .replace(/\\{user\\}/g,     message.author.username)
  );
}
`;
      },
    },
  },
};
