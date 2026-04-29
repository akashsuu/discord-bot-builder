'use strict';

module.exports = {
  nodes: {
    is_dm_based: {

      async execute(node, message, ctx) {
        if (!message) return false;

        const mode = (node.data.mode || "dm").toLowerCase();

        const isDM = !message.guild;

        let result = false;

        if (mode === "dm") {
          result = isDM;
        } else if (mode === "guild") {
          result = !isDM;
        }

        // Save result (optional)
        if (ctx) {
          ctx.isDM = isDM;
        }

        return result;
      },

      generateCode(node) {
        const mode = (node.data.mode || "dm").toLowerCase();

        return `
// ── Is DM Based ─────────────────────────
const isDM = !message.guild;

if (${mode === "dm" ? "isDM" : "!isDM"}) {
  // condition passed
}
`;
      }
    }
  }
};