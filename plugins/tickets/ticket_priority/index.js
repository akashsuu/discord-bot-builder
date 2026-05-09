'use strict';

/**
 * ticket_priority/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !priority <low|normal|medium|high>
 * Sets the priority of the current ticket and updates the channel topic.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

const VALID_PRIORITIES = ['low', 'normal', 'medium', 'high'];

const PRIORITY_DISPLAY = {
  low:    '🟢 Low',
  normal: '🔵 Normal',
  medium: '🟡 Medium',
  high:   '🔴 High',
};

module.exports = {
  meta: {
    name:          'Ticket Priority',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Sets the priority level of a ticket.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_priority: {
      label:       'Ticket Priority',
      icon:        '⚡',
      color:       '#7D3C98',
      description: 'Sets ticket priority: low, normal, medium, or high.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string', default: 'priority' },
        supportRoles: { type: 'string', default: '' },
        logChannel:   { type: 'string', default: '' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'priority').trim();
        const trigger = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(trigger.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ Not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff) {
          await message.reply('❌ Only support staff can change ticket priority.').catch(() => {});
          return false;
        }

        const level = message.content.slice(trigger.length).trim().toLowerCase();
        if (!VALID_PRIORITIES.includes(level)) {
          await message.reply(`Usage: \`${trigger} <${VALID_PRIORITIES.join('|')}>\``).catch(() => {});
          return false;
        }

        ticketHelper.updateTicket(message.channel.id, { priority: level });

        // Update channel topic to reflect new priority
        try {
          const currentTopic = message.channel.topic || '';
          const newTopic = currentTopic.replace(/Priority:\s*\w+/i, '').trim() +
            ` | Priority: ${level}`;
          await message.channel.setTopic(newTopic.trim());
        } catch { /* non-fatal */ }

        const display = PRIORITY_DISPLAY[level] || level;
        await message.channel.send(`⚡ **Priority updated:** ${display}`).catch(() => {});

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'priority', {
            '⚡ New Priority': display,
            '👤 Set By':      `<@${message.author.id}>`,
          }, { ...ticket, priority: level });
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Priority ───────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'priority')) {
  const level = message.content.slice((prefix + 'priority').length).trim().toLowerCase();
  const valid = ['low', 'normal', 'medium', 'high'];
  if (!valid.includes(level)) return message.reply('Usage: priority <low|normal|medium|high>');
  const ticket = ticketStore[message.channel.id];
  if (!ticket) return message.reply('Not a ticket.');
  ticket.priority = level;
  saveTickets(ticketStore);
  message.channel.send('⚡ Priority updated to ' + level);
}
`;
      },
    },
  },
};
