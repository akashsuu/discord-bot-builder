'use strict';

const { EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Rename Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Rename the current ticket channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_rename: {
      label: 'Rename Ticket',
      icon: 'EDIT',
      color: '#3498DB',
      description: 'Rename the ticket channel with a new name.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'rename',
          required: true,
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'rename').toLowerCase();
        if (!message.content.toLowerCase().startsWith(cmd)) return false;

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          const args = message.content.split(' ').slice(1);
          const newName = args.join('-').toLowerCase().slice(0, 100);

          if (!newName) {
            await message.reply(`Usage: \`${cmd} new-name\``).catch(() => {});
            return false;
          }

          const oldName = message.channel.name;
          await message.channel.setName(newName).catch(() => {});

          const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('✅ Ticket Renamed')
            .setDescription(`Channel renamed from **#${oldName}** to **#${newName}**`)
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_rename:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function renameTicket(channel, newName) {
  const { EmbedBuilder } = require('discord.js');

  const oldName = channel.name;
  await channel.setName(newName.toLowerCase().slice(0, 100)).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('✅ Ticket Renamed')
    .setDescription(\`Channel renamed from **#\${oldName}** to **#\${newName}\`);

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
