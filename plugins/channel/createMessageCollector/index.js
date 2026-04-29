'use strict';

module.exports = {
  nodes: {
    message_collector: {

      async execute(node, message, ctx) {
        if (!message || !message.channel) return false;
        if (message.author.bot) return false;

        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 5;
        const prompt = node.data.prompt || null;
        const saveAs = node.data.saveAs || "messages";

        // Optional prompt
        if (prompt) {
          if (ctx && ctx.sendEmbed && node.data.useEmbed) {
            await ctx.sendEmbed(message, node.data, prompt);
          } else {
            await message.channel.send(prompt);
          }
        }

        return new Promise((resolve) => {
          const collectedMessages = [];

          const collector = message.channel.createMessageCollector({
            filter: (m) => m.author.id === message.author.id,
            time: timeout,
            max: max
          });

          collector.on("collect", (m) => {
            collectedMessages.push(m.content);
          });

          collector.on("end", () => {
            // Save to context
            if (ctx) {
              ctx[saveAs] = collectedMessages;
            }

            resolve(true);
          });
        });
      },

      generateCode(node) {
        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 5;

        const prompt = (node.data.prompt || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Message Collector ─────────────────────────
${prompt ? `message.channel.send(\`${prompt}\`);` : ""}

const collectedMessages = [];

const collector = message.channel.createMessageCollector({
  filter: m => m.author.id === message.author.id,
  time: ${timeout},
  max: ${max}
});

collector.on("collect", m => {
  collectedMessages.push(m.content);
});

collector.on("end", () => {
  // collectedMessages available here
});
`;
      }
    }
  }
};