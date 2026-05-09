// ═══════════════════════════════════════════════════════════════════════════
// TICKET SYSTEM REGISTRY - Quick Reference
// ═══════════════════════════════════════════════════════════════════════════

module.exports = [
  {
    id: 'ticket_panel',
    name: 'Ticket Panel',
    description: 'Create an interactive panel with buttons for ticket categories',
    color: '#7289DA',
    command: 'ticketpanel',
    nodeType: 'ticket_panel',
    file: './ticket_panel/index.js',
    capabilities: ['embed customization', 'multiple categories', 'button labels'],
    inputs: ['trigger'],
    outputs: ['continue'],
  },

  {
    id: 'ticket_create',
    name: 'Create Ticket',
    description: 'Create a new ticket channel for users',
    color: '#43B581',
    command: '/ticket create',
    nodeType: 'ticket_create',
    file: './ticket_create/index.js',
    capabilities: ['category support', 'permission management', 'duplicate prevention', 'welcome message'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    config: {
      categoryChannel: 'Channel ID for tickets',
      logChannel: 'Channel ID for logs',
      maxTicketsPerUser: '1-10',
      ticketNaming: 'ticket-{username} or ticket-{number}',
      welcomeMessage: 'Custom welcome text',
    },
  },

  {
    id: 'ticket_close',
    name: 'Close Ticket',
    description: 'Close a ticket with transcript generation',
    color: '#E74C3C',
    command: '!close',
    nodeType: 'ticket_close',
    file: './ticket_close/index.js',
    capabilities: ['confirmation buttons', 'HTML transcripts', 'auto-delete', 'transcript archiving'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    config: {
      requireConfirmation: 'Show confirmation buttons',
      generateTranscript: 'Create HTML transcript',
      deleteDelay: '0-60 seconds',
      transcriptChannel: 'Channel ID for archives',
    },
  },

  {
    id: 'ticket_add',
    name: 'Add User to Ticket',
    description: 'Add a user to the ticket channel',
    color: '#9B59B6',
    command: '!add @user',
    nodeType: 'ticket_add',
    file: './ticket_add/index.js',
    capabilities: ['permission management', 'staff assignment'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
  },

  {
    id: 'ticket_remove',
    name: 'Remove User from Ticket',
    description: 'Remove a user from the ticket channel',
    color: '#E74C3C',
    command: '!remove @user',
    nodeType: 'ticket_remove',
    file: './ticket_remove/index.js',
    capabilities: ['permission revocation', 'staff removal'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
  },

  {
    id: 'ticket_rename',
    name: 'Rename Ticket',
    description: 'Rename the ticket channel',
    color: '#3498DB',
    command: '!rename new-name',
    nodeType: 'ticket_rename',
    file: './ticket_rename/index.js',
    capabilities: ['custom channel naming', 'topic updates'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
  },

  {
    id: 'ticket_lock',
    name: 'Lock Ticket',
    description: 'Lock a ticket (disable messaging)',
    color: '#34495E',
    command: '!lock',
    nodeType: 'ticket_lock',
    file: './ticket_lock/index.js',
    capabilities: ['send message prevention', 'view retention'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
  },

  {
    id: 'ticket_unlock',
    name: 'Unlock Ticket',
    description: 'Unlock a ticket (restore messaging)',
    color: '#27AE60',
    command: '!unlock',
    nodeType: 'ticket_unlock',
    file: './ticket_unlock/index.js',
    capabilities: ['permission restoration', 'messaging re-enable'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
  },

  {
    id: 'ticket_priority',
    name: 'Set Ticket Priority',
    description: 'Set or change ticket priority level',
    color: '#F39C12',
    command: '!priority [level]',
    nodeType: 'ticket_priority',
    file: './ticket_priority/index.js',
    capabilities: ['priority levels (4)', 'visual indicators', 'channel naming'],
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    priorities: ['low', 'medium', 'high', 'urgent'],
    emojis: {
      low: '🔵',
      medium: '🟡',
      high: '🔴',
      urgent: '🚨',
    },
  },

  {
    id: 'ticket_log',
    name: 'Ticket Logger',
    description: 'Log ticket events to a channel',
    color: '#95A5A6',
    nodeType: 'ticket_log',
    file: './ticket_log/index.js',
    capabilities: ['event logging', 'audit trail', 'timestamping'],
    inputs: ['trigger'],
    outputs: ['continue'],
    config: {
      logChannel: 'Channel ID for logs',
      logCreation: 'Log ticket creation',
      logClosing: 'Log ticket closing',
      logActions: 'Log all modifications',
    },
    events: [
      'TICKET_CREATED',
      'TICKET_CLOSED',
      'TICKET_PRIORITY',
      'USER_ADDED',
      'USER_REMOVED',
      'TICKET_LOCKED',
      'TICKET_UNLOCKED',
    ],
  },
];

// ─── DATABASE SCHEMA ───────────────────────────────────────────────────

const DATABASE_SCHEMA = {
  file: 'data/tickets.json',
  format: 'JSON Array',
  structure: {
    id: 'string - TKT-timestamp-random',
    guildId: 'string - Server ID',
    channelId: 'string - Ticket channel ID',
    ownerId: 'string - User ID of owner',
    category: 'string - support|billing|report|etc',
    priority: 'string - low|medium|high|urgent',
    locked: 'boolean - Is ticket locked',
    createdAt: 'ISO 8601 timestamp',
    closedAt: 'ISO 8601 timestamp or null',
    claimedBy: 'string - User ID or null',
    staffMembers: 'array - User IDs',
    closedBy: 'string - User ID or null',
    closeReason: 'string or null',
    transcriptUrl: 'string - Path or null',
    messages: 'array - Message objects',
  },
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────

const HELPER_FUNCTIONS = {
  file: 'ticketHelpers.js',
  functions: [
    'loadTickets()',
    'saveTickets(tickets)',
    'createTicketRecord(guildId, channelId, ownerId, category)',
    'generateTicketId()',
    'getTicketByChannel(channelId)',
    'getGuildTickets(guildId)',
    'getUserTickets(guildId, userId)',
    'hasOpenTicket(guildId, userId)',
    'getNextTicketNumber(guildId)',
    'closeTicket(channelId, reason, closedBy)',
    'setPriority(channelId, priority)',
    'addStaffMember(channelId, userId)',
    'removeStaffMember(channelId, userId)',
    'generateTranscript(channel, ticketData)',
    'saveTranscript(ticketId, html)',
    'createTicketChannel(guild, user, category, categoryId, options)',
    'getPriorityColor(priority)',
    'getPriorityEmoji(priority)',
    'buildTicketEmbed(ticket, user)',
    'escapeHtml(text)',
  ],
};

// ─── INTERACTION HANDLER ────────────────────────────────────────────────

const INTERACTION_HANDLER = {
  file: 'interactionHandler.js',
  class: 'TicketInteractionHandler',
  methods: [
    'handle(interaction)',
    'handleTicketCreate(interaction, category)',
    'handleTicketCloseConfirm(interaction)',
    'handleTicketLock(interaction)',
    'handleTicketUnlock(interaction)',
    'handleAddUserModal(interaction)',
    'handleRemoveUserModal(interaction)',
    'handlePriorityChange(interaction, priority)',
  ],
  supported: [
    'Button clicks',
    'String select menus',
    'Modal submissions',
  ],
};

// ─── BUTTON CUSTOM IDs ──────────────────────────────────────────────────

const BUTTON_IDS = {
  'ticket:create:CATEGORY': 'Create ticket for category',
  'ticket:close:confirm': 'Confirm ticket close',
  'ticket:close:cancel': 'Cancel ticket close',
  'ticket:lock': 'Lock ticket',
  'ticket:unlock': 'Unlock ticket',
  'ticket:add': 'Show add user modal',
  'ticket:remove': 'Show remove user modal',
  'ticket:priority:LEVEL': 'Set priority level',
};

// ─── INSTALLATION ────────────────────────────────────────────────────────

const INSTALLATION = `
1. Copy plugins/ticketsystem/ folder to your project

2. Register plugins:
   const plugins = [
     require('./plugins/ticketsystem/ticket_panel'),
     require('./plugins/ticketsystem/ticket_create'),
     // ... etc
   ];
   
   for (const p of plugins) {
     registry.register(p.meta.name, p);
   }

3. Setup interaction handler:
   const TicketInteractionHandler = require('./plugins/ticketsystem/interactionHandler');
   const handler = new TicketInteractionHandler(client);
   
   client.on('interactionCreate', async (i) => {
     await handler.handle(i);
   });

4. Configure in node editor:
   - Set category channel ID
   - Set log channel ID
   - Set transcript channel ID
   - Configure embed colors
   - Test ticket creation
`;

// ─── QUICK COMMANDS ────────────────────────────────────────────────────

const COMMANDS = {
  admin: [
    '!ticketpanel - Create panel',
  ],
  user: [
    '/ticket create - Create ticket',
    '!close - Close ticket',
    '!tickets - List tickets',
  ],
  staff: [
    '!add @user - Add user',
    '!remove @user - Remove user',
    '!rename name - Rename ticket',
    '!lock - Lock ticket',
    '!unlock - Unlock ticket',
    '!priority level - Set priority',
  ],
};

// ─── FEATURES CHECKLIST ────────────────────────────────────────────────

const FEATURES = [
  '✅ Interactive button panel',
  '✅ Multi-category support',
  '✅ Priority system (4 levels)',
  '✅ User management (add/remove)',
  '✅ Lock/unlock functionality',
  '✅ Channel renaming',
  '✅ HTML transcript generation',
  '✅ Comprehensive logging',
  '✅ JSON database',
  '✅ Code generation',
  '✅ Customizable embeds',
  '✅ Duplicate prevention',
  '✅ Permission management',
  '✅ Error handling',
  '✅ Production ready',
];

module.exports = {
  PLUGIN_LIST: module.exports,
  DATABASE_SCHEMA,
  HELPER_FUNCTIONS,
  INTERACTION_HANDLER,
  BUTTON_IDS,
  INSTALLATION,
  COMMANDS,
  FEATURES,
};
