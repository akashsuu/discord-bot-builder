'use strict';

module.exports = {
  client: {

    async execute(node, client, ctx) {
      if (!client) return false;

      try {
        // 🔹 Fetch sounds
        const sounds = await client.fetchDefaultSoundboardSounds();

        const list = Array.from(sounds.values());

        // 🔹 Save to context
        const key = node.data.saveAs || "sounds";
        if (ctx) {
          ctx[key] = list;
        }

        // 🔹 Output
        let text = node.data.output || "Found {count} sounds";

        text = text.replace(/\{count\}/g, list.length);

        // Note: client plugins usually don't have message context
        console.log(text);

        return true;

      } catch (err) {
        console.error("❌ Failed to fetch soundboard sounds:", err);
        return false;
      }
    },

    generateCode(node) {
      return `
// ── Fetch Default Soundboard Sounds ─────────────
client.fetchDefaultSoundboardSounds()
  .then(sounds => {
    console.log("Sounds:", sounds.size);
  })
  .catch(console.error);
`;
    }
  }
};