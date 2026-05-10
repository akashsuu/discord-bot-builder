'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'calculator').trim() || 'calculator';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const cmd = String(command || '').trim();
    if (!cmd) continue;
    if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
    const rest = text.slice(cmd.length);
    if (!rest || /^\s/.test(rest)) return { args: rest.trim() };
  }
  return null;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x5865F2 : parsed;
}

function tokenize(input) {
  const source = String(input || '').replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/π/g, 'pi');
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let raw = ch;
      i += 1;
      while (i < source.length && /[\d.]/.test(source[i])) raw += source[i++];
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value });
      continue;
    }
    if (source.slice(i, i + 2).toLowerCase() === 'pi') {
      tokens.push({ type: 'number', value: Math.PI });
      i += 2;
      continue;
    }
    if (ch.toLowerCase() === 'e') {
      tokens.push({ type: 'number', value: Math.E });
      i += 1;
      continue;
    }
    if ('+-*/^()%'.includes(ch)) {
      tokens.push({ type: ch === '(' || ch === ')' ? 'paren' : 'op', value: ch });
      i += 1;
      continue;
    }
    throw new Error('Unsupported character');
  }
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const ops = [];
  const precedence = { u: 5, '%': 4, '^': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
  const rightAssoc = new Set(['^', 'u']);
  let previous = null;

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
      previous = token;
      continue;
    }
    if (token.type === 'paren' && token.value === '(') {
      ops.push(token);
      previous = token;
      continue;
    }
    if (token.type === 'paren' && token.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') output.push(ops.pop());
      if (!ops.length) throw new Error('Mismatched parentheses');
      ops.pop();
      previous = token;
      continue;
    }

    let op = token.value;
    if (op === '-' && (!previous || (previous.type === 'op' && previous.value !== '%') || (previous.type === 'paren' && previous.value === '('))) {
      op = 'u';
    }
    const current = { type: 'op', value: op };
    while (ops.length) {
      const top = ops[ops.length - 1];
      if (top.type === 'paren') break;
      const shouldPop = rightAssoc.has(op)
        ? precedence[op] < precedence[top.value]
        : precedence[op] <= precedence[top.value];
      if (!shouldPop) break;
      output.push(ops.pop());
    }
    ops.push(current);
    previous = current;
  }

  while (ops.length) {
    const op = ops.pop();
    if (op.type === 'paren') throw new Error('Mismatched parentheses');
    output.push(op);
  }
  return output;
}

function evaluateExpression(input) {
  const rpn = toRpn(tokenize(input));
  const stack = [];
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
      continue;
    }
    if (token.value === 'u') {
      if (!stack.length) throw new Error('Invalid expression');
      stack.push(-stack.pop());
      continue;
    }
    if (token.value === '%') {
      if (!stack.length) throw new Error('Invalid expression');
      stack.push(stack.pop() / 100);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error('Invalid expression');
    if (token.value === '+') stack.push(a + b);
    else if (token.value === '-') stack.push(a - b);
    else if (token.value === '*') stack.push(a * b);
    else if (token.value === '/') {
      if (b === 0) throw new Error('Division by zero');
      stack.push(a / b);
    } else if (token.value === '^') stack.push(a ** b);
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Invalid expression');
  return Number.parseFloat(stack[0].toFixed(10)).toString();
}

function varsFor(message, data, expression, result, status) {
  const now = new Date();
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: message.channel?.name || '',
    command: data.command || 'calculator',
    aliases: [data.command || 'calculator', ...splitAliases(data.aliases)].map((a) => `${message.clientPrefix || ''}${a}`).join(', '),
    expression,
    result,
    status,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function buildEmbed(data, vars) {
  return new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#5865F2'))
    .setTitle(applyTemplate(data.titleTemplate || 'Calculator Screen', vars))
    .setDescription([
      `**${data.expressionLabel || 'Expression'}**`,
      `\`${vars.expression || '0'}\``,
      '',
      `**${data.resultLabel || 'Result'}**`,
      `\`${vars.result || data.readyText || 'Ready'}\``,
      '',
      `**${data.statusLabel || 'Status'}**`,
      vars.status || data.readyText || 'Ready',
    ].join('\n'))
    .setFooter({ text: applyTemplate(data.footerTemplate || 'Aliases: {aliases} • Today at {time}', vars) });
}

function button(customId, label, style = ButtonStyle.Secondary) {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
}

function calculatorRows(nonce) {
  const id = (action) => `calculator:${action}:${nonce}`;
  return [
    new ActionRowBuilder().addComponents(
      button(id('clear'), 'C', ButtonStyle.Danger),
      button(id('back'), '⌫'),
      button(id('open'), '('),
      button(id('close'), ')'),
      button(id('div'), '÷', ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      button(id('7'), '7'),
      button(id('8'), '8'),
      button(id('9'), '9'),
      button(id('mul'), '×', ButtonStyle.Primary),
      button(id('pow'), '^', ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      button(id('4'), '4'),
      button(id('5'), '5'),
      button(id('6'), '6'),
      button(id('sub'), '-', ButtonStyle.Primary),
      button(id('percent'), '%', ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      button(id('1'), '1'),
      button(id('2'), '2'),
      button(id('3'), '3'),
      button(id('add'), '+', ButtonStyle.Primary),
      button(id('equals'), '=', ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      button(id('0'), '0'),
      button(id('dot'), '.'),
      button(id('pi'), 'π'),
      button(id('e'), 'e'),
      button(id('solve'), 'SOLVE', ButtonStyle.Success)
    ),
  ];
}

function applyButton(expression, action) {
  const values = {
    div: '÷',
    mul: '×',
    sub: '-',
    add: '+',
    pow: '^',
    percent: '%',
    open: '(',
    close: ')',
    dot: '.',
    pi: 'π',
    e: 'e',
  };
  if (action === 'clear') return '0';
  if (action === 'back') return expression.length <= 1 ? '0' : expression.slice(0, -1);
  const next = values[action] ?? (/[0-9]/.test(action) ? action : '');
  return expression === '0' && /[0-9πe(]/.test(next) ? next : `${expression}${next}`;
}

async function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
    else await interaction.reply({ content, ephemeral: true });
  } catch {
    // Ignore expired interactions.
  }
}

module.exports = {
  meta: {
    name: 'Calculator',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Calculate like a real calculator with interactive buttons.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_calculator: {
      label: 'Calculator',
      icon: 'CAL',
      color: '#5865F2',
      description: 'Interactive calculator command with number, operator, clear, backspace, and solve buttons.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'calculator', required: true },
        aliases: { type: 'string', default: 'calc,math,solve', required: false },
        titleTemplate: { type: 'string', default: 'Calculator Screen', required: false },
        expressionLabel: { type: 'string', default: 'Expression', required: false },
        resultLabel: { type: 'string', default: 'Result', required: false },
        statusLabel: { type: 'string', default: 'Status', required: false },
        readyText: { type: 'string', default: 'Ready', required: false },
        errorText: { type: 'string', default: 'Error', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        message.clientPrefix = prefix;
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        let expression = matched.args || '0';
        let result = data.readyText || 'Ready';
        let status = data.readyText || 'Ready';
        const nonce = `${message.id || Date.now()}`;
        const render = () => buildEmbed(data, varsFor(message, data, expression, result, status));

        if (matched.args) {
          try {
            result = evaluateExpression(expression);
            status = data.readyText || 'Ready';
          } catch (err) {
            result = data.errorText || 'Error';
            status = err.message || data.errorText || 'Error';
          }
        }

        if (data.embedEnabled === false) {
          await message.channel.send(`${expression} = ${result}`);
          return true;
        }

        const panel = await message.channel.send({
          embeds: [render()],
          components: calculatorRows(nonce),
        });

        const collector = panel.createMessageComponentCollector?.({ time: 10 * 60 * 1000 });
        collector?.on('collect', async (interaction) => {
          if (interaction.user?.id !== message.author.id) {
            await safeReply(interaction, applyTemplate(data.onlyUserMessage || 'Only {user} can use this calculator.', varsFor(message, data, expression, result, status)));
            return;
          }

          const [, action, incomingNonce] = String(interaction.customId || '').split(':');
          if (incomingNonce !== nonce) return;

          if (action === 'equals' || action === 'solve') {
            try {
              result = evaluateExpression(expression);
              status = data.readyText || 'Ready';
            } catch (err) {
              result = data.errorText || 'Error';
              status = err.message || data.errorText || 'Error';
            }
          } else {
            expression = applyButton(expression, action);
            result = data.readyText || 'Ready';
            status = data.readyText || 'Ready';
          }

          await interaction.update({
            embeds: [render()],
            components: calculatorRows(nonce),
          });
        });

        collector?.on('end', async () => {
          await panel.edit({ components: [] }).catch(() => {});
        });

        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'calculator').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Calculator command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length).trim();
  message.channel.send(_rest ? "Calculator result: configure this plugin node for safe runtime calculation." : "Calculator opened.");
}`;
      },
    },
  },
};
