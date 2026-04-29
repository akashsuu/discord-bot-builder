'use strict';

module.exports = {
  nodes: {
    await_component: {

      async execute(node, message, ctx) {
        if (!message || !message.channel) return false;

        const customId = node.data.customId || "btn_1";
        const timeout = parseInt(node.data.timeout) || 15000;
        const reply = node.data.reply || "Interaction received!";

        try {
          const interaction = await message.channel.awaitMessageComponent({
            filter: (i) => i.customId === customId,
            time: timeout
          });

          // Reply to interaction
          await interaction.reply({
            content: reply,
            ephemeral: true
          });

          // Store interaction in context (VERY IMPORTANT)
          if (ctx) {
            ctx.interaction = interaction;
          }

          return true;

        } catch (err) {
          // Timeout or error
          if (ctx && ctx.logger) {
            ctx.logger("Component wait timed out");
          }

          return false;
        }
      },

      generateCode(node) {
        const id = (node.data.customId || "btn_1").replace(/"/g, '\\"');
        const timeout = parseInt(node.data.timeout) || 15000;
        const reply = (node.data.reply || "Interaction received!")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Await Component ─────────────────────────────
try {
  const interaction = await message.channel.awaitMessageComponent({
    filter: (i) => i.customId === "${id}",
    time: ${timeout}
  });

  await interaction.reply({
    content: \`${reply}\`,
    ephemeral: true
  });

} catch (err) {
  // Timeout
}
`;
      }
    }
  }
};