'use strict';

const path = require('path');

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

async function blurAvatarFromUrl(url, blurAmount) {
 const Jimp = getJimpCtor();
 if (!Jimp) throw new Error('jimp module not found');

 const res = await fetch(url);
 if (!res.ok) throw new Error(`Avatar fetch failed: ${res.status}`);
 const arr = await res.arrayBuffer();
 const img = await Jimp.read(Buffer.from(arr));
 img.blur(Math.max(1, Math.min(100, Number(blurAmount) || 8)));
 return await img.getBuffer('image/png');
}

module.exports = {
 meta: {
 name: 'Blur Avatar',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Blurs a user avatar using Jimp. Usage: blur @user',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_blur: {
 label: 'Blur Avatar',
 icon: 'BLR',
 color: '#64748B',
 description: 'Blurs mentioned user avatar. Usage: blur @user',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: 'blur', required: true },
 blurAmount: { type: 'number', default: 8, required: false },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#64748B', required: false },
 titleTemplate: { type: 'string', default: '{target}\'s Blurred Avatar', required: false },
 descriptionTemplate: { type: 'string', default: 'Requested by {requester}', required: false },
 plainTextTemplate: { type: 'string', default: '{target} avatar blurred by {requester}', required: false },
 noTargetMessage: { type: 'string', default: '❌ You need to mention someone. Usage: `{command} @user`', required: false },
 missingModuleMessage: { type: 'string', default: '❌ jimp module is not installed.', required: false },
 errorMessage: { type: 'string', default: '❌ Failed to blur avatar. Try again later.', required: false },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'blur').trim();
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

 const blurAmount = Number(node.data?.blurAmount) || 8;
 let imgBuffer;
 try {
 imgBuffer = await blurAvatarFromUrl(avatarUrl, blurAmount);
 } catch {
 try { await message.reply(node.data?.errorMessage || '❌ Failed to blur avatar. Try again later.'); } catch {}
 return false;
 }

 const fileName = `blurred-${targetUser.id || 'user'}.png`;
 const vars = { requester: message.author.username, target: targetUser.username, blurAmount: String(blurAmount) };
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#64748B').replace('#', ''), 16) || 0x64748B;
 const title = applyTemplate(node.data?.titleTemplate || '{target}\'s Blurred Avatar', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || 'Requested by {requester}', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '{target} avatar blurred by {requester}', vars);

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
 try { await message.reply(node.data?.errorMessage || '❌ Failed to send blurred avatar.'); } catch {}
 return false;
 }

 return true;
 },
 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'blur').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const blurAmount = Number(node.data?.blurAmount) || 8;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#64748B').replace('#', ''), 16) || 0x64748B;
 const titleTemplate = (node.data?.titleTemplate || '{target}\'s Blurred Avatar').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || 'Requested by {requester}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '{target} avatar blurred by {requester}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
 let _blur_jimp = null;
 try { const _m = require("jimp"); _blur_jimp = _m.Jimp || _m.default || _m; } catch {}
 if (!_blur_jimp) {
 message.reply("❌ jimp module is not installed.").catch(() => {});
 } else {
 const _blur_target = message.mentions.users.first();
 if (!_blur_target) {
 message.reply("❌ Mention someone to blur. Usage: \\\`${cmd} @user\\\`").catch(() => {});
 } else {
 const _blur_url = _blur_target.displayAvatarURL({ size: 512, extension: "png", forceStatic: true });
 fetch(_blur_url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
 .then(arr => _blur_jimp.read(Buffer.from(arr)))
 .then(img => {
 img.blur(${blurAmount});
 return img.getBuffer("image/png");
 })
 .then(buf => {
 const _blur_vars = { requester: message.author.username, target: _blur_target.username, blurAmount: "${blurAmount}" };
 const _blur_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_blur_vars[k] - m));
 const _blur_title = _blur_apply(\`${titleTemplate}\`);
 const _blur_desc = _blur_apply(\`${descriptionTemplate}\`);
 const _blur_plain = _blur_apply(\`${plainTextTemplate}\`);
 const _blur_name = "blurred-" + (_blur_target.id || "user") + ".png";
 ${embedEnabled ? `
 message.channel.send({
 content: _blur_plain,
 files: [{ attachment: buf, name: _blur_name }],
 embeds: [{ color: ${color}, author: { name: _blur_title }, description: _blur_desc, image: { url: "attachment://" + _blur_name }, timestamp: new Date().toISOString() }]
 }).catch(() => {});
 ` : `
 message.channel.send({ content: _blur_plain, files: [{ attachment: buf, name: _blur_name }] }).catch(() => {});
 `}
 })
 .catch(() => message.reply("❌ Failed to blur avatar.").catch(() => {}));
 }
 }
}
`;
 },
 },
 },
};
