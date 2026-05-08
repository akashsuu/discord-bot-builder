'use strict';

let figletLib = null;
try {
  figletLib = require('figlet');
} catch {
  figletLib = null;
}

function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toAscii(text, font, width, horizontalLayout) {
  if (!figletLib) throw new Error('figlet module not found');
  return figletLib.textSync(String(text), {
    font: font || 'Standard',
    width: Number.isFinite(width) ? width : 80,
    horizontalLayout: horizontalLayout || 'default',
  });
}

module.exports = {
  meta: {
    name: 'Text Art',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Converts input text into ASCII art using figlet.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    fun_textart: {
      label: 'Text Art',
      icon: 'TXT',
      color: '#0EA5E9',
      description: 'Usage: textart hello',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'textart', required: true },
        font: { type: 'string', default: 'Standard', required: false },
        maxChars: { type: 'number', default: 40, required: false },
        usageMessage: { type: 'string', default: '❌ Usage: `{command} <text>`', required: false },
        tooLongMessage: { type: 'string', default: '❌ Text too long. Max {max} characters.', required: false },
        missingModuleMessage: { type: 'string', default: '❌ figlet module is not installed.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'textart').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;

        const content = String(message.content || '').trim();
        const match = content.match(new RegExp(`^${escapeRegExp(cmd)}(?:\\s+(.+))?$`, 'i'));
        if (!match) return false;

        const inputText = (match[1] || '').trim();
        if (!inputText) {
          const usage = String(node.data?.usageMessage || '❌ Usage: `{command} <text>`').replace('{command}', cmd);
          try { await message.reply(usage); } catch {}
          return false;
        }

        const maxChars = Number(node.data?.maxChars) || 40;
        if (inputText.length > maxChars) {
          const tooLong = String(node.data?.tooLongMessage || '❌ Text too long. Max {max} characters.').replace('{max}', String(maxChars));
          try { await message.reply(tooLong); } catch {}
          return false;
        }

        if (!figletLib) {
          try { await message.reply(node.data?.missingModuleMessage || '❌ figlet module is not installed.'); } catch {}
          return false;
        }

        let ascii = '';
        try {
          ascii = toAscii(inputText, node.data?.font || 'Standard', 80, 'default');
        } catch {
          try { await message.reply('❌ Failed to generate ASCII art.'); } catch {}
          return false;
        }

        const formatted = '```' + '\n' + ascii.trimEnd() + '\n' + '```';
        try {
          await message.channel.send(formatted);
        } catch {
          try { await message.reply('❌ Could not send ASCII art.'); } catch {}
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'textart').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const font = (node.data?.font || 'Standard').replace(/"/g, '\\"');
        const maxChars = Number(node.data?.maxChars) || 40;
        const usageMessage = (node.data?.usageMessage || '❌ Usage: `{command} <text>`').replace(/"/g, '\\"');
        const tooLongMessage = (node.data?.tooLongMessage || '❌ Text too long. Max {max} characters.').replace(/"/g, '\\"');
        const missingModuleMessage = (node.data?.missingModuleMessage || '❌ figlet module is not installed.').replace(/"/g, '\\"');

        return `
{
  let _ta_figlet = null;
  try { _ta_figlet = require("figlet"); } catch {}
  const _ta_cmd = "${cmd}";
  const _ta_content = String(message.content || "").trim();
  if (_ta_content.toLowerCase().startsWith(_ta_cmd.toLowerCase()) && !message.author.bot) {
    const _ta_text = String(_ta_content.slice(_ta_cmd.length) || "").trim();
    if (!_ta_text) {
      message.reply("${usageMessage}".replace("{command}", _ta_cmd)).catch(() => {});
    } else if (_ta_text.length > ${maxChars}) {
      message.reply("${tooLongMessage}".replace("{max}", "${maxChars}")).catch(() => {});
    } else if (!_ta_figlet) {
      message.reply("${missingModuleMessage}").catch(() => {});
    } else {
      try {
        const _ta_ascii = _ta_figlet.textSync(_ta_text, { font: "${font}", width: 80, horizontalLayout: "default" });
        message.channel.send("\\\`\\\`\\\`\\n" + String(_ta_ascii).trimEnd() + "\\n\\\`\\\`\\\`").catch(() => {});
      } catch {
        message.reply("❌ Failed to generate ASCII art.").catch(() => {});
      }
    }
  }
}
`;
      },
    },
  },
};
