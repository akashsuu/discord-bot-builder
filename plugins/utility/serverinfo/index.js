'use strict';

const { ChannelType } = require('discord.js');

// ── Verification level labels ─────────────────────────────────────────────────
const VER_LEVEL = ['🔓 None', '🔒 Low', '🔐 Medium', '🛡️ High', '🔑 Highest'];

// ── Boost tier labels ─────────────────────────────────────────────────────────
const BOOST_TIER = ['No Level', 'Level 1', 'Level 2', 'Level 3'];

// ── Compact number formatter ──────────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

// ── Apply {token} substitution for the plain-text output template ─────────────
function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

// ── Convert hex color string to integer ───────────────────────────────────────
function hexToInt(hex) {
  const n = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
  return isNaN(n) ? 0x5865F2 : n;
}

// ── Build timestamp string from a Date ────────────────────────────────────────
function relativeTimestamp(date) {
  const ts = Math.floor(date.getTime() / 1000);
  return `<t:${ts}:D> (<t:${ts}:R>)`;
}

module.exports = {
  meta: {
    name: 'Server Info',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Sends detailed server information as a rich embed or plain text.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_serverinfo: {
      label: 'Server Info',
      icon: '🏠',
      color: '#1A4A7A',
      description: 'Shows server stats. Supports {server}, {serverId}, {memberCount}, {humanCount}, {botCount}, {owner}, {ownerId}, {boostLevel}, {boostCount}, {roles}, {textChannels}, {voiceChannels}, {categories}, {channels}, {verification}, {createdAt}, {description}, {user}.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'serverinfo', required: true },
        output: { type: 'string', default: '📊 **{server}** `{serverId}` · 👥 {memberCount} members · 👑 Owner: {owner} · 🚀 Boost Level {boostLevel}', required: false },
        embedColor: { type: 'string', default: '#5865F2', required: false },
        embedFooter: { type: 'string', default: 'Server ID: {serverId}', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author.bot) return false;
        if (!message.guild) return false;

        // ── 1. Command match ────────────────────────────────────────────────
        const prefix = ctx?.prefix || '!';
        const rawCmd = (node.data?.command || 'serverinfo').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const content = message.content;

        if (!content.toLowerCase().startsWith(cmd.toLowerCase())) return false;
        // Prevent "!serverinfos" matching "!serverinfo"
        const rem = content.slice(cmd.length);
        if (rem && !/^\s/.test(rem)) return false;

        // ── 2. Fetch fresh guild data ───────────────────────────────────────
        let guild;
        try { guild = await message.guild.fetch(); }
        catch { guild = message.guild; }

        // ── 3. Gather member stats ──────────────────────────────────────────
        // Fetch members if cache is stale
        let members = guild.members.cache;
        if (members.size < guild.memberCount) {
          try { members = (await guild.members.fetch()).values(); members = guild.members.cache; }
          catch { /* use cached data */ }
        }
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter((m) => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // ── 4. Gather channel stats ─────────────────────────────────────────
        const channels = guild.channels.cache;
        const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
        const stageChannels = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;
        const forumChannels = channels.filter((c) => c.type === ChannelType.GuildForum).size;
        const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
        const totalChannels = channels.size;

        // ── 5. Roles ────────────────────────────────────────────────────────
        const roleCount = guild.roles.cache.size - 1; // exclude @everyone

        // ── 6. Owner ────────────────────────────────────────────────────────
        let ownerName = 'Unknown', ownerId = guild.ownerId;
        try {
          const ownerMember = await guild.fetchOwner();
          ownerName = ownerMember.user.username;
          ownerId = ownerMember.user.id;
        } catch { /* owner might not be fetchable */ }

        // ── 7. Boost ────────────────────────────────────────────────────────
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount ?? 0;

        // ── 8. Verification & features ──────────────────────────────────────
        const verLabel = VER_LEVEL[guild.verificationLevel] ?? '❓ Unknown';
        const features = (guild.features || [])
          .map((f) => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()))
          .sort();

        // ── 9. Time ─────────────────────────────────────────────────────────
        const createdTimestamp = relativeTimestamp(guild.createdAt);
        const createdAtStr = guild.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // ── 10. Build variable map for templates ────────────────────────────
        const vars = {
          server: guild.name,
          serverName: guild.name,
          serverId: guild.id,
          memberCount: fmt(totalMembers),
          humanCount: fmt(humanCount),
          botCount: fmt(botCount),
          owner: ownerName,
          ownerId,
          boostLevel: String(boostLevel),
          boostTier: BOOST_TIER[boostLevel] ?? 'No Level',
          boostCount: String(boostCount),
          roles: String(roleCount),
          textChannels: String(textChannels),
          voiceChannels: String(voiceChannels),
          categories: String(categories),
          channels: String(totalChannels),
          verification: verLabel,
          createdAt: createdAtStr,
          description: guild.description || '',
          user: message.author?.username || 'Unknown',
          command: cmd,
        };

        // ── 11. Send response ───────────────────────────────────────────────
        if (node.data?.embedEnabled !== false) {
          await sendServerEmbed(message, guild, vars, node.data, {
            textChannels, voiceChannels, stageChannels, forumChannels, categories,
            boostLevel, boostCount, boostTier: BOOST_TIER[boostLevel] ?? 'No Level',
            humanCount, botCount, totalMembers, roleCount, verLabel,
            createdTimestamp, features, ownerId, ownerName,
          });
        } else {
          const tpl = node.data?.output || '📊 **{server}** `{serverId}` · 👥 {memberCount} members';
          const text = applyTemplate(tpl, vars);
          try {
            if (ctx?.sendEmbed) await ctx.sendEmbed(message, { ...node.data, embedEnabled: false }, text);
            else await message.channel.send(text);
          } catch {
            await message.channel.send(text).catch(() => { });
          }
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'serverinfo').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const color = hexToInt(node.data?.embedColor || '#5865F2');
        return `
// ── Server Info ──────────────────────────────────────────────────────
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rem = message.content.slice("${cmd}".length);
  if (_rem && !/^\\s/.test(_rem)) return;
  if (!message.guild) return;

  (async () => {
    let _g; try { _g = await message.guild.fetch(); } catch { _g = message.guild; }
    let _ownerName = "Unknown";
    try { const _o = await _g.fetchOwner(); _ownerName = _o.user.username; } catch {}

    const _bots  = _g.members.cache.filter(m => m.user.bot).size;
    const _total = _g.memberCount;
    const _tc    = _g.channels.cache.filter(c => c.type === 0).size;
    const _vc    = _g.channels.cache.filter(c => c.type === 2).size;
    const _cat   = _g.channels.cache.filter(c => c.type === 4).size;
    const _roles = _g.roles.cache.size - 1;
    const _boost = ["No Level","Level 1","Level 2","Level 3"][_g.premiumTier] ?? "No Level";
    const _ver   = ["🔓 None","🔒 Low","🔐 Medium","🛡️ High","🔑 Highest"][_g.verificationLevel] ?? "Unknown";
    const _ts    = Math.floor(_g.createdAt.getTime() / 1000);

    const _embed = {
      title: \`🏠 \${_g.name}\`,
      color: ${color},
      thumbnail: _g.iconURL() ? { url: _g.iconURL({ size: 256, extension: "png" }) } : undefined,
      description: _g.description || undefined,
      fields: [
        { name: "👑 Owner",         value: _ownerName,                                        inline: true },
        { name: "🆔 Server ID",     value: \`\\\`\${_g.id}\\\`\`,                              inline: true },
        { name: "📅 Created",        value: \`<t:\${_ts}:D> (<t:\${_ts}:R>)\`,                 inline: false },
        { name: "👥 Members",        value: \`Total: **\${_total.toLocaleString()}**\\n👤 Humans: \${(_total-_bots).toLocaleString()}\\n🤖 Bots: \${_bots.toLocaleString()}\`, inline: true },
        { name: "💬 Channels",       value: \`💬 Text: **\${_tc}**\\n🔊 Voice: \${_vc}\\n📂 Categories: \${_cat}\`,                                                          inline: true },
        { name: "🎭 Roles",          value: \`**\${_roles}** roles\`,                          inline: true },
        { name: "🚀 Boost",          value: \`\${_boost} · \${_g.premiumSubscriptionCount??0} boosts\`, inline: true },
        { name: "🔒 Verification",   value: _ver,                                             inline: true },
      ],
      footer: { text: \`Server ID: \${_g.id}\` },
      timestamp: new Date().toISOString(),
    };
    message.channel.send({ embeds: [_embed] });
  })();
}`;
      },
    },
  },
};

// ── Rich embed builder ────────────────────────────────────────────────────────
async function sendServerEmbed(message, guild, vars, nodeData, stats) {
  const {
    textChannels,
    voiceChannels,
    stageChannels,
    forumChannels,
    categories,
    boostLevel,
    boostCount,
    boostTier,
    humanCount,
    botCount,
    totalMembers,
    roleCount,
    verLabel,
    createdTimestamp,
    features,
    ownerId,
    ownerName,
  } = stats;

  const color = hexToInt(nodeData?.embedColor || '#5865F2');

  const iconURL =
    guild.iconURL({ size: 256, extension: 'png', dynamic: true }) || null;

  const bannerURL =
    guild.bannerURL({ size: 1024, extension: 'png' }) || null;

  // ── Boost bar ─────────────────────────────────────────────────────────────
  const boostBar =
    boostCount > 0
      ? '🟣'.repeat(Math.min(boostCount, 10)) +
      (boostCount > 10 ? `+${boostCount - 10}` : '')
      : 'No boosts yet';

  // ── Extended template vars ───────────────────────────────────────────────
  const fullVars = {
    ...vars,

    ownerMention: `<@${ownerId}>`,
    createdTimestamp,

    textChannels,
    voiceChannels,
    stageChannels,
    forumChannels,
    categories,

    boostBar,
    boostTier,
    boostCount,

    roles: roleCount,

    verification: verLabel,
  };

  // ── Default editable templates ───────────────────────────────────────────
  const ownerTemplate =
    nodeData?.ownerTemplate ||
    `👑 Owner
{ownerMention} ({owner})`;

  const serverIdTemplate =
    nodeData?.serverIdTemplate ||
    `🆔 Server ID
{serverId}`;

  const createdTemplate =
    nodeData?.createdTemplate ||
    `📅 Created
{createdAt} ({createdTimestamp})`;

  const membersTemplate =
    nodeData?.membersTemplate ||
    `👥 Members
{memberCount} total
👤 Humans: {humanCount}
🤖 Bots: {botCount}`;

  const channelsTemplate =
    nodeData?.channelsTemplate ||
    `💬 Channels
💬 Text: {textChannels}
🔊 Voice: {voiceChannels}
📂 Categories: {categories}`;

  const rolesTemplate =
    nodeData?.rolesTemplate ||
    `🎭 Roles
{roles} roles`;

  const boostTemplate =
    nodeData?.boostTemplate ||
    `🚀 Boost — {boostTier}
{boostBar}
{boostCount} boosts`;

  const verificationTemplate =
    nodeData?.verificationTemplate ||
    `🔒 Verification
{verification}`;

  // ── Build embed ──────────────────────────────────────────────────────────
  const embed = {
    title: applyTemplate(
      nodeData?.embedTitle || '🏠 {server}',
      fullVars
    ),

    color,

    thumbnail: iconURL ? { url: iconURL } : undefined,

    image: bannerURL ? { url: bannerURL } : undefined,

    description: [
      applyTemplate(ownerTemplate, fullVars),
      '',
      applyTemplate(serverIdTemplate, fullVars),
      '',
      applyTemplate(createdTemplate, fullVars),
      '',
      applyTemplate(membersTemplate, fullVars),
      '',
      applyTemplate(channelsTemplate, fullVars),
      '',
      applyTemplate(rolesTemplate, fullVars),
      '',
      applyTemplate(boostTemplate, fullVars),
      '',
      applyTemplate(verificationTemplate, fullVars),
    ].join('\n'),

    footer: {
      text: applyTemplate(
        nodeData?.embedFooter || 'Server ID: {serverId}',
        fullVars
      ),
    },

    timestamp: new Date().toISOString(),
  };

  // ── Optional features field ──────────────────────────────────────────────
  if (features.length > 0) {
    const shown = features.slice(0, 8);
    const extra =
      features.length > 8
        ? ` +${features.length - 8} more`
        : '';

    embed.fields = [
      {
        name: `✨ Features (${features.length})`,
        value: shown.join('\n') + extra,
        inline: false,
      },
    ];
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  await message.channel.send({
    embeds: [embed],
  });
}
