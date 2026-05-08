'use strict';

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
  );
}

module.exports = {
  meta: {
    name: 'Avatar',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows user avatar with mention support.',
    engineVersion: '>=1.0.0',
  },
  nodes: {
    fun_avatar: {
      label: 'Avatar',
      icon: 'AVT',
      color: '#3B82F6',
      description: 'Usage: avatar @user (or avatar for self)',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'avatar', required: true },
        embedEnabled: { type: 'boolean', default: true, required: false },
        embedColor: { type: 'string', default: '#3B82F6', required: false },
        titleTemplate: { type: 'string', default: '{target}\'s Avatar', required: false },
        descriptionTemplate: { type: 'string', default: 'Requested by {requester}', required: false },
        plainTextTemplate: { type: 'string', default: '{target} avatar: {avatarUrl}', required: false },
        noAvatarMessage: { type: 'string', default: '❌ Could not find avatar for {target}.', required: false },
      },
      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'avatar').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const targetUser =
          ctx.flow?.targetUser ||
          ctx.flow?.targetMember?.user ||
          message.mentions.users?.first() ||
          message.author;

        const avatarUrl = targetUser?.displayAvatarURL
          ? targetUser.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false })
          : '';

        const vars = {
          requester: message.author.username,
          target: targetUser?.username || 'Unknown',
          avatarUrl,
        };

        if (!avatarUrl) {
          try { await message.reply(applyTemplate(node.data?.noAvatarMessage || '❌ Could not find avatar for {target}.', vars)); } catch {}
          return false;
        }

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.avatarData = { ...vars };

        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#3B82F6').replace('#', ''), 16) || 0x3B82F6;
        const title = applyTemplate(node.data?.titleTemplate || '{target}\'s Avatar', vars);
        const desc = applyTemplate(node.data?.descriptionTemplate || 'Requested by {requester}', vars);
        const plain = applyTemplate(node.data?.plainTextTemplate || '{target} avatar: {avatarUrl}', vars);

        try {
          if (embedEnabled) {
            await message.channel.send({
              embeds: [{
                color,
                author: { name: title },
                description: desc,
                image: { url: avatarUrl },
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
        const rawCmd = (node.data?.command || 'avatar').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#3B82F6').replace('#', ''), 16) || 0x3B82F6;
        const titleTemplate = (node.data?.titleTemplate || '{target}\'s Avatar').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || 'Requested by {requester}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '{target} avatar: {avatarUrl}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _av_target = message.mentions.users.first() || message.author;
  const _av_url = _av_target?.displayAvatarURL ? _av_target.displayAvatarURL({ size: 1024, extension: "png", forceStatic: false }) : "";
  const _av_vars = { requester: message.author.username, target: _av_target?.username || "Unknown", avatarUrl: _av_url };
  const _av_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_av_vars[k] ?? m));
  const _av_title = _av_apply(\`${titleTemplate}\`);
  const _av_desc = _av_apply(\`${descriptionTemplate}\`);
  const _av_plain = _av_apply(\`${plainTextTemplate}\`);
  if (!_av_url) {
    message.reply("❌ Could not find avatar.").catch(() => {});
  } else {
    ${embedEnabled ? `
    message.channel.send({ embeds: [{ color: ${color}, author: { name: _av_title }, description: _av_desc, image: { url: _av_url }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_av_plain).catch(() => {}));
    ` : `
    message.channel.send(_av_plain).catch(() => {});
    `}
  }
}`;
      },
    },
  },
};
