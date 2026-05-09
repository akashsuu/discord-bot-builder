'use strict';

/**
 * helpers/permissions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared permission checks and channel overwrites for the ticket system.
 *
 * Support roles are comma-separated IDs stored in node.data.supportRoles.
 */

const { PermissionFlagsBits } = require('discord.js');

// ── Parse support role IDs from node data ─────────────────────────────────────
function parseSupportRoles(nodeData) {
  const raw = nodeData?.supportRoles || '';
  return String(raw)
    .split(/[\s,]+/)
    .map(id => id.trim())
    .filter(id => /^\d+$/.test(id));
}

// ── Check if a GuildMember is support staff ───────────────────────────────────
function isSupportStaff(member, nodeData) {
  if (!member) return false;
  // Admins always count as staff
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;

  const roles = parseSupportRoles(nodeData);
  if (roles.length === 0) return false;
  return roles.some(roleId => member.roles.cache.has(roleId));
}

// ── Build permissionOverwrites array for a new ticket channel ─────────────────
/**
 * @param {import('discord.js').Guild}       guild
 * @param {import('discord.js').User}        owner  — ticket creator
 * @param {string[]}                          supportRoleIds
 * @returns {object[]}  permissionOverwrites array
 */
function buildPermissionOverwrites(guild, owner, supportRoleIds = []) {
  const overwrites = [
    // Block @everyone by default
    {
      id:   guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // Allow ticket owner
    {
      id:   owner.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  // Allow each support role
  for (const roleId of supportRoleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    overwrites.push({
      id:   roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  return overwrites;
}

// ── Lock a channel (block owner from sending) ─────────────────────────────────
async function lockChannel(channel, ownerId) {
  try {
    await channel.permissionOverwrites.edit(ownerId, {
      SendMessages: false,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Unlock a channel (restore owner's send permission) ────────────────────────
async function unlockChannel(channel, ownerId) {
  try {
    await channel.permissionOverwrites.edit(ownerId, {
      SendMessages: true,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Add a user to a ticket channel ───────────────────────────────────────────
async function addUserToChannel(channel, userId) {
  try {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel:        true,
      SendMessages:       true,
      ReadMessageHistory: true,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Remove a user from a ticket channel ──────────────────────────────────────
async function removeUserFromChannel(channel, userId) {
  try {
    await channel.permissionOverwrites.delete(userId);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  parseSupportRoles,
  isSupportStaff,
  buildPermissionOverwrites,
  lockChannel,
  unlockChannel,
  addUserToChannel,
  removeUserFromChannel,
};
