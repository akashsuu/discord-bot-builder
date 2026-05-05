'use strict';

// ════════════════════════════════════════════════════════════════════
//  EXAMPLE of the v2 plugin format — read this as the reference impl.
//
//  Key differences from the legacy format:
//  1. Top-level `meta` block with engineVersion semver range.
//  2. execute(ctx) receives ONE structured context object.
//     Legacy 3-arg signature (node, eventObj, legacyCtx) is still
//     supported by the engine's backward-compat adapter — but new
//     plugins should use the single-ctx style.
//  3. Per-node configSchema declares types, defaults, and constraints
//     so the GUI can auto-generate property panels.
//  4. Lifecycle hooks (onLoad / onUnload) for setup and cleanup.
// ════════════════════════════════════════════════════════════════════

const { PermissionFlagsBits } = require('discord.js');

module.exports = {

  // ── 1. Meta ──────────────────────────────────────────────────────
  // engineVersion is a semver range. The loader rejects the plugin if
  // the running engine version does not satisfy it — prevents silent
  // breakage when the engine makes a breaking change.
  meta: {
    name:          'Ban',
    version:       '2.0.0',
    author:        'Akashsuu',
    description:   'Permanently bans a member from the server.',
    engineVersion: '>=1.0.0',
  },

  // ── 2. Optional global plugin config ─────────────────────────────
  config: {
    schema: {
      auditLog: { type: 'boolean', default: true, description: 'Post to audit-log channel' },
    },
    defaults: { auditLog: true },
  },

  // ── 3. Lifecycle hooks ────────────────────────────────────────────
  async onLoad(api) {
    // api is the safeAPI — proxied client, scoped logger, frozen config.
    // Use this for one-time setup: registering listeners, loading caches, etc.
    api?.log.info('Ban plugin ready');
  },

  async onUnload() {
    // Clean up timers, intervals, or external connections here.
    // Called when the plugin is removed at runtime.
  },

  // ── 4. Nodes ──────────────────────────────────────────────────────
  nodes: {
    mod_ban: {
      // Visual metadata used by the GUI palette
      label:       'Ban',
      description: 'Permanently bans a mentioned member.',
      icon:        '🔨',
      color:       '#C0392B',

      // Port declarations — used by the GUI to draw connectors
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      // Config schema: drives GUI property panel + runtime validation
      // type / default / required / min / max / description are all supported
      configSchema: {
        command:    { type: 'string',  default: 'ban',               required: true  },
        reason:     { type: 'string',  default: 'No reason provided', required: false },
        deleteDays: { type: 'number',  default: 0, min: 0, max: 7,   required: false },
      },

      // ── execute(ctx) — the runtime handler ────────────────────────
      // ctx shape:
      //   node        — graph node (id, type, data)
      //   message     — Discord Message (null for non-message events)
      //   eventData   — raw Discord event object
      //   eventType   — string, e.g. 'messageCreate'
      //   prefix      — global command prefix string
      //   api         — safeAPI (proxied client, log, config, utils)
      //   sendEmbed   — helper: sendEmbed(message, nodeData, text)
      //   buildEmbed  — helper: buildEmbed(nodeData, text) → embed object
      async execute(ctx) {
        const { node, message, prefix, api } = ctx;
        if (!message || message.author.bot || !message.guild) return false;

        const rawCmd = (node.data?.command || 'ban').trim();
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('❌ You need **Ban Members** permission.');
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`❌ Usage: \`${cmd} @user [reason]\``);
          return false;
        }
        if (target.id === message.author.id || target.id === message.client.user.id) {
          await message.reply('❌ You cannot ban yourself or me.');
          return false;
        }
        if (!target.bannable) {
          await message.reply('❌ I cannot ban that user (role too high?).');
          return false;
        }

        const after      = message.content.slice(cmd.length).trim();
        const reason     = after.replace(/<@!?\d+>/g, '').trim() || node.data?.reason || 'No reason provided';
        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);

        await target.ban({ reason, deleteMessageSeconds: deleteDays * 86_400 });
        await message.channel.send(`🔨 **${target.user.tag}** has been banned.\n📋 Reason: ${reason}`);

        api?.log.info(`Banned ${target.user.tag} in "${message.guild.name}" — ${reason}`);
        return true; // return true to continue traversing output edges
      },

      // ── generateCode(node, prefix) — for the Export feature ───────
      // Must return a self-contained JS snippet that fits inside the
      // generated bot.js messageCreate handler.
      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'ban').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const days   = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);
        return `
// ── Ban ─────────────────────────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.member?.permissions.has("BanMembers")) {
    message.reply("❌ You need Ban Members permission.");
  } else {
    const _t = message.mentions.members?.first();
    if (!_t) {
      message.reply(\`❌ Usage: \\\`${cmd} @user [reason]\\\`\`);
    } else if (!_t.bannable) {
      message.reply("❌ I cannot ban that user.");
    } else {
      const _r = message.content.slice("${cmd}".length).trim()
                   .replace(/<@!?\\d+>/g, "").trim() || "${reason}";
      _t.ban({ reason: _r, deleteMessageSeconds: ${days * 86_400} })
        .then(() => message.channel.send(\`🔨 **\${_t.user.tag}** banned.\\n📋 Reason: \${_r}\`));
    }
  }
}`;
      },
    },
  },
};
