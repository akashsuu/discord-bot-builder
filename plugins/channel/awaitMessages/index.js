'use strict';

module.exports = {
  nodes: {
    await_messages: {

      async execute(node, message, ctx) {
        if (!message || !message.channel) return false;

        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 1;
        const prompt = node.data.prompt || null;
        const saveAs = node.data.saveAs || "input";

        // Optional prompt message
        if (prompt) {
          await message.channel.send(prompt);
        }

        try {
          const collected = await message.channel.awaitMessages({
            filter: (m) => m.author.id === message.author.id,
            max: max,
            time: timeout,
            errors: ["time"]
          });

          const responses = collected.map(m => m.content);

          // Save into context (VERY IMPORTANT)
          if (ctx) {
            ctx[saveAs] = max === 1 ? responses[0] : responses;
          }

          return true;

        } catch (err) {
          // Timeout
          if (ctx && ctx.logger) {
            ctx.logger("awaitMessages timed out");
          }

          return false;
        }
      },

      generateCode(node) {
        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 1;
        const prompt = (node.data.prompt || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Await Messages ─────────────────────────────
try {
  ${prompt ? `await message.channel.send(\`${prompt}\`);` : ""}

  const collected = await message.channel.awaitMessages({
    filter: m => m.author.id === message.author.id,
    max: ${max},
    time: ${timeout},
    errors: ["time"]
  });

  const responses = collected.map(m => m.content);

  // You can use responses here

} catch (err) {
  // Timeout
}
`;
      }
    }
  }
};