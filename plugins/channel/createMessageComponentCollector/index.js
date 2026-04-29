'use strict';

module.exports = {
  nodes: {
    component_collector: {

      async execute(node, message, ctx) {
        if (!message || !message.channel) return false;

        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 5;
        const customId = node.data.customId || null;
        const reply = node.data.reply || null;
        const saveAs = node.data.saveAs || "interactions";

        return new Promise((resolve) => {
          const collected = [];

          const collector = message.channel.createMessageComponentCollector({
            filter: (i) => {
              if (customId && i.customId !== customId) return false;
              return true;
            },
            time: timeout,
            max: max
          });

          collector.on("collect", async (interaction) => {
            collected.push({
              id: interaction.customId,
              user: interaction.user.id,
              values: interaction.values || null
            });

            // Optional reply
            if (reply) {
              try {
                await interaction.reply({
                  content: reply,
                  ephemeral: true
                });
              } catch {}
            }
          });

          collector.on("end", () => {
            if (ctx) {
              ctx[saveAs] = collected;
            }

            resolve(true);
          });
        });
      },

      generateCode(node) {
        const timeout = parseInt(node.data.timeout) || 15000;
        const max = parseInt(node.data.max) || 5;
        const customId = node.data.customId || "";

        const reply = (node.data.reply || "")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Component Collector ─────────────────────────
const collected = [];

const collector = message.channel.createMessageComponentCollector({
  filter: (i) => ${customId ? `i.customId === "${customId}"` : "true"},
  time: ${timeout},
  max: ${max}
});

collector.on("collect", async (interaction) => {
  collected.push({
    id: interaction.customId,
    user: interaction.user.id,
    values: interaction.values || null
  });

  ${reply ? `
  await interaction.reply({
    content: \`${reply}\`,
    ephemeral: true
  });
  ` : ""}
});

collector.on("end", () => {
  // collected interactions available here
});
`;
      }
    }
  }
};