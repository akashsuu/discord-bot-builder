'use strict';

module.exports = {
  nodes: {
    emoji_constructor: {

      async execute(node, message, ctx) {
        const input = node.data.emoji || "👍";

        let emojiData = {
          raw: input,
          type: "unicode",
          name: input,
          id: null
        };

        // 🔹 Detect custom emoji
        const match = input.match(/^<a?:([\w_]+):(\d+)>$/);

        if (match) {
          emojiData = {
            raw: input,
            type: "custom",
            name: match[1],
            id: match[2],
            animated: input.startsWith("<a:")
          };
        }

        // 🔹 Save to context
        if (ctx) {
          ctx[node.data.saveAs || "emoji"] = emojiData;
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Emoji Constructor ─────────────────────
const emoji = "${node.data.emoji}";
`;
      }
    }
  }
};