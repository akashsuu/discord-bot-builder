'use strict';

module.exports = {
  nodes: {
    equal: {

      async execute(node, message, ctx) {

        const resolveValue = (val) => {
          // 🔹 ctx reference support
          if (typeof val === "string" && val.startsWith("$ctx.")) {
            const path = val.slice(5).split(".");
            let current = ctx;

            for (const p of path) {
              if (current && typeof current === "object") {
                current = current[p];
              } else {
                return undefined;
              }
            }

            return current;
          }

          return val;
        };

        const a = resolveValue(node.data.a);
        const b = resolveValue(node.data.b);

        let result;

        if (node.data.strict === true || node.data.strict === "true") {
          result = a === b;
        } else {
          result = a == b;
        }

        // 🔹 Save result
        if (ctx) {
          ctx[node.data.saveAs || "equalResult"] = result;
        }

        return result;
      },

      generateCode(node) {
        return `
// ── Equal ─────────────────────────
if ("${node.data.a}" === "${node.data.b}") {
  // true
}
`;
      }
    }
  }
};