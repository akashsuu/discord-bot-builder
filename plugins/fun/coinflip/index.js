'use strict';

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
  );
}

module.exports = {
  meta: {
    name: 'Coinflip',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Flips a coin and returns heads or tails.',
    engineVersion: '>=1.0.0',
  },
  nodes: {
    fun_coinflip: {
      label: 'Coinflip',
      icon: 'CF',
      color: '#EAB308',
      description: 'Usage: coinflip',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'coinflip', required: true },
        embedEnabled: { type: 'boolean', default: true, required: false },
        embedColor: { type: 'string', default: '#EAB308', required: false },
        titleTemplate: { type: 'string', default: '{requester} flipped a coin!', required: false },
        descriptionTemplate: { type: 'string', default: 'Result: **{result}** {emoji}', required: false },
        plainTextTemplate: { type: 'string', default: 'Result: {result} {emoji}', required: false },
      },
      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'coinflip').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🎯';
        const vars = { requester: message.author.username, result, emoji };

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.coinflipData = { ...vars };

        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#EAB308').replace('#', ''), 16) || 0xEAB308;
        const title = applyTemplate(node.data?.titleTemplate || '{requester} flipped a coin!', vars);
        const desc = applyTemplate(node.data?.descriptionTemplate || 'Result: **{result}** {emoji}', vars);
        const plain = applyTemplate(node.data?.plainTextTemplate || 'Result: {result} {emoji}', vars);

        try {
          if (embedEnabled) {
            await message.channel.send({
              embeds: [{
                color,
                author: { name: title },
                description: desc,
                timestamp: new Date().toISOString(),
              }]
            });
          } else {
            await message.channel.send(plain);
          }
        } catch {
          try { await message.channel.send(plain); } catch {}
        }

        return true;
      },
      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'coinflip').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#EAB308').replace('#', ''), 16) || 0xEAB308;
        const titleTemplate = (node.data?.titleTemplate || '{requester} flipped a coin!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || 'Result: **{result}** {emoji}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || 'Result: {result} {emoji}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
if (message.content.trim().toLowerCase() === "${cmd.toLowerCase()}" && !message.author.bot) {
  const _cf_result = Math.random() < 0.5 ? "Heads" : "Tails";
  const _cf_emoji = _cf_result === "Heads" ? "🪙" : "🎯";
  const _cf_vars = { requester: message.author.username, result: _cf_result, emoji: _cf_emoji };
  const _cf_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_cf_vars[k] ?? m));
  const _cf_title = _cf_apply(\`${titleTemplate}\`);
  const _cf_desc = _cf_apply(\`${descriptionTemplate}\`);
  const _cf_plain = _cf_apply(\`${plainTextTemplate}\`);
  ${embedEnabled ? `
  message.channel.send({ embeds: [{ color: ${color}, author: { name: _cf_title }, description: _cf_desc, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_cf_plain).catch(() => {}));
  ` : `
  message.channel.send(_cf_plain).catch(() => {});
  `}
}`;
      },
    },
  },
};
