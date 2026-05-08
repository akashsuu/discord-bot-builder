'use strict';

let JimpModule = null;
try {
  JimpModule = require('jimp');
} catch {
  JimpModule = null;
}

function getJimpCtor() {
  if (!JimpModule) return null;
  return JimpModule.Jimp || JimpModule.default || JimpModule;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
  );
}

async function pixelateAvatarFromUrl(url, pixelSize) {
  const Jimp = getJimpCtor();
  if (!Jimp) throw new Error('jimp module not found');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Avatar fetch failed: ${res.status}`);
  const arr = await res.arrayBuffer();
  const img = await Jimp.read(Buffer.from(arr));
  img.pixelate(Math.max(1, Math.min(100, Number(pixelSize) || 8)));
  return await img.getBuffer('image/png');
}

module.exports = {
  meta: {
    name: 'Pixelate Avatar',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Pixelates a user avatar using Jimp. Usage: pixelate @user',
    engineVersion: '>=1.0.0',
  },
  nodes: {
    fun_pixelate: {
      label: 'Pixelate Avatar',
      icon: 'PXL',
      color: '#8B5CF6',
      description: 'Pixelates mentioned user avatar. Usage: pixelate @user',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'pixelate', required: true },
        pixelSize: { type: 'number', default: 8, required: false },
        embedEnabled: { type: 'boolean', default: true, required: false },
        embedColor: { type: 'string', default: '#8B5CF6', required: false },
        titleTemplate: { type: 'string', default: '{target}\'s Pixelated Avatar', required: false },
        descriptionTemplate: { type: 'string', default: 'Requested by {requester}', required: false },
        plainTextTemplate: { type: 'string', default: '{target} avatar pixelated by {requester}', required: false },
        noTargetMessage: { type: 'string', default: '❌ You need to mention someone. Usage: `{command} @user`', required: false },
        missingModuleMessage: { type: 'string', default: '❌ jimp module is not installed.', required: false },
        errorMessage: { type: 'string', default: '❌ Failed to pixelate avatar. Try again later.', required: false },
      },
      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'pixelate').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!getJimpCtor()) {
          try { await message.reply(node.data?.missingModuleMessage || '❌ jimp module is not installed.'); } catch {}
          return false;
        }

        const targetUser =
          ctx.flow?.targetUser ||
          ctx.flow?.targetMember?.user ||
          message.mentions.users?.first() ||
          null;

        if (!targetUser) {
          const noTarget = applyTemplate(node.data?.noTargetMessage || '❌ You need to mention someone. Usage: `{command} @user`', { command: cmd });
          try { await message.reply(noTarget); } catch {}
          return false;
        }

        const avatarUrl = targetUser.displayAvatarURL
          ? targetUser.displayAvatarURL({ size: 512, extension: 'png', forceStatic: true })
          : '';
        if (!avatarUrl) {
          try { await message.reply('❌ Could not get target avatar.'); } catch {}
          return false;
        }

        const pixelSize = Number(node.data?.pixelSize) || 8;
        let imgBuffer;
        try {
          imgBuffer = await pixelateAvatarFromUrl(avatarUrl, pixelSize);
        } catch {
          try { await message.reply(node.data?.errorMessage || '❌ Failed to pixelate avatar. Try again later.'); } catch {}
          return false;
        }

        const fileName = `pixelated-${targetUser.id || 'user'}.png`;
        const vars = { requester: message.author.username, target: targetUser.username, pixelSize: String(pixelSize) };
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#8B5CF6').replace('#', ''), 16) || 0x8B5CF6;
        const title = applyTemplate(node.data?.titleTemplate || '{target}\'s Pixelated Avatar', vars);
        const desc = applyTemplate(node.data?.descriptionTemplate || 'Requested by {requester}', vars);
        const plain = applyTemplate(node.data?.plainTextTemplate || '{target} avatar pixelated by {requester}', vars);

        try {
          if (embedEnabled) {
            await message.channel.send({
              content: plain,
              files: [{ attachment: imgBuffer, name: fileName }],
              embeds: [{
                color,
                author: { name: title },
                description: desc,
                image: { url: `attachment://${fileName}` },
                timestamp: new Date().toISOString(),
              }],
            });
          } else {
            await message.channel.send({
              content: plain,
              files: [{ attachment: imgBuffer, name: fileName }],
            });
          }
        } catch {
          try { await message.reply(node.data?.errorMessage || '❌ Failed to send pixelated avatar.'); } catch {}
          return false;
        }

        return true;
      },
      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'pixelate').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const pixelSize = Number(node.data?.pixelSize) || 8;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#8B5CF6').replace('#', ''), 16) || 0x8B5CF6;
        const titleTemplate = (node.data?.titleTemplate || '{target}\'s Pixelated Avatar').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || 'Requested by {requester}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '{target} avatar pixelated by {requester}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  let _px_jimp = null;
  try { const _m = require("jimp"); _px_jimp = _m.Jimp || _m.default || _m; } catch {}
  if (!_px_jimp) {
    message.reply("❌ jimp module is not installed.").catch(() => {});
  } else {
    const _px_target = message.mentions.users.first();
    if (!_px_target) {
      message.reply("❌ Mention someone to pixelate. Usage: \\\`${cmd} @user\\\`").catch(() => {});
    } else {
      const _px_url = _px_target.displayAvatarURL({ size: 512, extension: "png", forceStatic: true });
      fetch(_px_url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
        .then(arr => _px_jimp.read(Buffer.from(arr)))
        .then(img => {
          img.pixelate(${pixelSize});
          return img.getBuffer("image/png");
        })
        .then(buf => {
          const _px_vars = { requester: message.author.username, target: _px_target.username, pixelSize: "${pixelSize}" };
          const _px_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_px_vars[k] ?? m));
          const _px_title = _px_apply(\`${titleTemplate}\`);
          const _px_desc = _px_apply(\`${descriptionTemplate}\`);
          const _px_plain = _px_apply(\`${plainTextTemplate}\`);
          const _px_name = "pixelated-" + (_px_target.id || "user") + ".png";
          ${embedEnabled ? `
          message.channel.send({
            content: _px_plain,
            files: [{ attachment: buf, name: _px_name }],
            embeds: [{ color: ${color}, author: { name: _px_title }, description: _px_desc, image: { url: "attachment://" + _px_name }, timestamp: new Date().toISOString() }]
          }).catch(() => {});
          ` : `
          message.channel.send({ content: _px_plain, files: [{ attachment: buf, name: _px_name }] }).catch(() => {});
          `}
        })
        .catch(() => message.reply("❌ Failed to pixelate avatar.").catch(() => {}));
    }
  }
}
`;
      },
    },
  },
};
