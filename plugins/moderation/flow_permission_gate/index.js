'use strict';

const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  meta: {
    name:          'Flow Permission Gate',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Guards downstream nodes based on user ID list, role list, admin status, or everyone.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    flow_permission_gate: {
      label:       'Permission Gate',
      icon:        '🔐',
      color:       '#3A1E5F',
      description: 'Reads ctx.allowedUsers / ctx.allowedRoles. Returns false and sends deny message if the author is not authorised.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Allowed',  type: 'flow' }],

      configSchema: {
        permission: {
          type:        'string',
          default:     'user',
          enum:        ['user', 'role', 'admin', 'everyone'],
          required:    true,
          description: 'user = ctx.allowedUsers | role = ctx.allowedRoles | admin = Administrator perm | everyone = always pass',
        },
        denyMessage: {
          type:        'string',
          default:     '❌ You are not allowed to use this command.',
          required:    false,
          description: 'Message sent when access is denied (supports {user})',
        },
        silent: {
          type:        'boolean',
          default:     false,
          required:    false,
          description: 'When true, block silently without sending a deny message',
        },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild) return false;

        const type   = node.data?.permission || 'user';
        const member = message.member;

        // ── Permission check ─────────────────────────────────────────────────
        let allowed = false;

        switch (type) {
          case 'everyone':
            allowed = true;
            break;

          case 'admin':
            allowed = member?.permissions.has(PermissionFlagsBits.Administrator) === true;
            break;

          case 'user':
            allowed = ctx.allowedUsers instanceof Set
              ? ctx.allowedUsers.has(message.author.id)
              : false;
            break;

          case 'role':
            if (ctx.allowedRoles instanceof Set && ctx.allowedRoles.size > 0) {
              allowed = member?.roles.cache.some((r) => ctx.allowedRoles.has(r.id)) === true;
            }
            break;

          default:
            allowed = false;
        }

        // ── Handle denial ────────────────────────────────────────────────────
        if (!allowed) {
          if (!node.data?.silent) {
            const tpl = node.data?.denyMessage || '❌ You are not allowed to use this command.';
            const text = tpl.replace(/\{user\}/g, message.author?.username || 'Unknown');
            try {
              if (ctx.sendEmbed) {
                await ctx.sendEmbed(message, node.data, text);
              } else {
                await message.reply(text);
              }
            } catch {
              await message.reply(text).catch(() => {});
            }
          }
          return false;
        }

        return true;
      },

      generateCode(node) {
        const type    = node.data?.permission || 'user';
        const silent  = node.data?.silent || false;
        const denyMsg = (node.data?.denyMessage || '❌ You are not allowed to use this command.').replace(/"/g, '\\"');

        let check;
        switch (type) {
          case 'everyone': check = 'true'; break;
          case 'admin':    check = 'message.member?.permissions.has("Administrator")'; break;
          case 'user':     check = '_allowedUsers instanceof Set && _allowedUsers.has(message.author.id)'; break;
          case 'role':     check = '_allowedRoles instanceof Set && message.member?.roles.cache.some(r => _allowedRoles.has(r.id))'; break;
          default:         check = 'false';
        }
        return `
// ── Permission Gate (${type}) ────────────────────────────────────────
if (!(${check})) {${silent ? '' : `
  message.reply("${denyMsg}");`}
  return;
}`;
      },
    },
  },
};
