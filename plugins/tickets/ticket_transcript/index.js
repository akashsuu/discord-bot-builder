'use strict';

/**
 * ticket_transcript/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !transcript
 * Manually generates an HTML transcript for the current ticket.
 * Uploads a summary and saves the file locally.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));
const { generateTranscript } = require(path.join(__dirname, '..', 'helpers', 'transcripts.js'));

const fs = require('fs');

module.exports = {
  meta: {
    name:          'Ticket Transcript',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Generates an HTML transcript for the current ticket.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_transcript: {
      label:       'Ticket Transcript',
      icon:        '📄',
      color:       '#1F618D',
      description: 'Generates and saves an HTML transcript of the ticket.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string', default: 'transcript' },
        supportRoles: { type: 'string', default: '' },
        logChannel:   { type: 'string', default: '' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'transcript').trim();
        const trigger = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(trigger.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ Not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff && message.author.id !== ticket.ownerId) {
          await message.reply('❌ You cannot generate a transcript for this ticket.').catch(() => {});
          return false;
        }

        const genMsg = await message.channel.send('⏳ Generating transcript...').catch(() => null);

        let transcriptPath;
        try {
          transcriptPath = await generateTranscript(message.channel, ticket, message.guild.name);
          ticketHelper.updateTicket(message.channel.id, { transcriptPath });
        } catch (err) {
          await genMsg?.edit(`❌ Failed to generate transcript: ${err.message}`).catch(() => {});
          return false;
        }

        const filename = path.basename(transcriptPath);
        const fileSize = fs.statSync(transcriptPath).size;
        const sizeKB   = (fileSize / 1024).toFixed(1);

        try {
          // Upload transcript HTML as a file attachment if size allows
          if (fileSize < 8 * 1024 * 1024) { // 8 MB limit
            await message.channel.send({
              content: `📄 **Transcript generated** — \`${filename}\` (${sizeKB} KB)`,
              files: [{ attachment: transcriptPath, name: filename }],
            });
          } else {
            await message.channel.send(`📄 **Transcript generated** — \`${filename}\` (${sizeKB} KB)\nFile saved locally.`);
          }
        } catch { /* non-fatal if upload fails */ }

        await genMsg?.delete().catch(() => {});

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'transcript', {
            '📄 File':    filename,
            '📏 Size':    `${sizeKB} KB`,
            '👤 By':      `<@${message.author.id}>`,
          }, ticket);
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Transcript ─────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'transcript')) {
  // Generate HTML transcript — see helpers/transcripts.js for full implementation
  const { generateTranscript } = require('./plugins/tickets/helpers/transcripts');
  const ticket = ticketStore[message.channel.id];
  if (!ticket) return message.reply('Not a ticket.');
  const filePath = await generateTranscript(message.channel, ticket, message.guild.name);
  message.channel.send({ files: [filePath] });
}
`;
      },
    },
  },
};
