'use strict';

/**
 * Example plugin — registers a "ping_command" node type.
 *
 * execute()      — called by botRunner when a message arrives
 * generateCode() — called by codeExporter when user exports JS
 */
module.exports = {
  nodes: {
    ping_command: {
      async execute(node, message) {
        if (message.content.trim().toLowerCase() !== '!ping') return false;

        const latency = Date.now() - message.createdTimestamp;
        await message.channel.send(`🏓 Pong! Latency: **${latency}ms**`);
        return true; // allow downstream nodes to run
      },

      generateCode(node) {
        return `if (message.content.trim().toLowerCase() === "!ping") {
  const latency = Date.now() - message.createdTimestamp;
  message.channel.send(\`🏓 Pong! Latency: \${latency}ms\`);
}`;
      },
    },
  },
};
