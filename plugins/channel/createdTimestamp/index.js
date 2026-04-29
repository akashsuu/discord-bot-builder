'use strict';

module.exports = {
  nodes: {
    create_timestamp: {

      async execute(node, message, ctx) {
        const offset = parseInt(node.data.timeOffset) || 0;
        const format = node.data.format || "F";
        const saveAs = node.data.saveAs || "timestamp";

        // Current time + offset (in seconds)
        const now = Math.floor(Date.now() / 1000);
        const finalTime = now + offset;

        const timestamp = `<t:${finalTime}:${format}>`;

        // Save to context (VERY IMPORTANT)
        if (ctx) {
          ctx[saveAs] = timestamp;
        }

        // Output text
        let text = node.data.output || "{timestamp}";

        text = text.replace(/\{timestamp\}/g, timestamp);

        if (ctx && ctx.sendEmbed && node.data.useEmbed) {
          await ctx.sendEmbed(message, node.data, text);
        } else {
          await message.channel.send(text);
        }

        return true;
      },

      generateCode(node) {
        const offset = parseInt(node.data.timeOffset) || 0;
        const format = node.data.format || "F";

        const tpl = (node.data.output || "{timestamp}")
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// ── Create Timestamp ─────────────────────────
const _now = Math.floor(Date.now() / 1000);
const _time = _now + ${offset};

const _ts = \`<t:\${_time}:${format}>\`;

message.channel.send(
  \`${tpl}\`.replace(/\\{timestamp\\}/g, _ts)
);
`;
      }
    }
  }
};