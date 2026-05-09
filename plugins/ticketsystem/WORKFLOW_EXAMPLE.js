// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW EXAMPLE: Complete Ticket System Flow
// ═══════════════════════════════════════════════════════════════════════════

/*
This file shows a complete workflow for the ticket system in your node editor.

NODES USED:
1. ticket_panel - Create the initial panel
2. ticket_create - Handle ticket creation
3. ticket_log - Log all events
4. ticket_close - Close tickets
5. ticket_priority - Set priority
6. ticket_lock - Lock tickets
7. ticket_unlock - Unlock tickets
8. ticket_add - Add staff
9. ticket_remove - Remove staff

WORKFLOW:
  [Start]
    ↓
  [ticket_panel] - Create buttons
    ├─→ [ticket_create] - User creates ticket
    │    ├─→ [ticket_log] - Log creation
    │    ├─→ [ticket_add] - Add staff member
    │    └─→ [ticket_priority] - Set initial priority
    │         └─→ [ticket_log] - Log priority change
    │
    └─ Ticket Created
         ├─→ [ticket_lock] - Lock if needed
         │    └─→ [ticket_log] - Log lock
         │
         ├─→ [ticket_priority] - Change priority
         │    └─→ [ticket_log] - Log change
         │
         ├─→ [ticket_unlock] - Unlock if locked
         │    └─→ [ticket_log] - Log unlock
         │
         └─→ [ticket_close] - Close when done
              ├─→ [ticket_log] - Log closing
              └─→ [transcript] - Archive
*/

// ─── EXPORTED WORKFLOW JSON ──────────────────────────────────────────────

const WORKFLOW = {
  nodes: [
    // ─── TICKET PANEL ───────────────────────────────────────────────────
    {
      id: 'node-1',
      type: 'ticket_panel',
      position: { x: 0, y: 0 },
      data: {
        command: 'ticketpanel',
        embedTitle: 'Support Tickets',
        embedDescription: 'Click a button to create a ticket.',
        embedColor: '#7289DA',
        embedThumbnail: '',
        embedFooter: 'Ticket System',
        categories: 'support,billing,report,partnership',
        buttonLabels: 'Create Support Ticket,Billing Issue,Report User,Partnership',
      },
    },

    // ─── TICKET CREATE ──────────────────────────────────────────────────
    {
      id: 'node-2',
      type: 'ticket_create',
      position: { x: 200, y: 100 },
      data: {
        categoryChannel: '1234567890', // Your category ID
        logChannel: '9876543210',      // Your log channel ID
        maxTicketsPerUser: 1,
        ticketNaming: 'ticket-{username}',
        allowDuplicates: false,
        welcomeMessage: 'Welcome! Please describe your issue. A team member will help soon.',
      },
    },

    // ─── TICKET PRIORITY (INITIAL) ──────────────────────────────────────
    {
      id: 'node-3',
      type: 'ticket_priority',
      position: { x: 400, y: 100 },
      data: {
        command: 'priority',
        priority: 'medium', // Default priority
      },
    },

    // ─── TICKET LOCK ───────────────────────────────────────────────────
    {
      id: 'node-4',
      type: 'ticket_lock',
      position: { x: 600, y: 200 },
      data: {
        command: 'lock',
      },
    },

    // ─── TICKET UNLOCK ────────────────────────────────────────────────
    {
      id: 'node-5',
      type: 'ticket_unlock',
      position: { x: 800, y: 200 },
      data: {
        command: 'unlock',
      },
    },

    // ─── TICKET CLOSE ────────────────────────────────────────────────
    {
      id: 'node-6',
      type: 'ticket_close',
      position: { x: 1000, y: 100 },
      data: {
        command: 'close',
        requireConfirmation: true,
        generateTranscript: true,
        deleteDelay: 5,
        transcriptChannel: '1111111111', // Transcript archive channel
      },
    },

    // ─── TICKET LOG ─────────────────────────────────────────────────
    {
      id: 'node-7',
      type: 'ticket_log',
      position: { x: 1200, y: 100 },
      data: {
        logChannel: '9876543210',
        logCreation: true,
        logClosing: true,
        logActions: true,
      },
    },

    // ─── TICKET ADD USER ────────────────────────────────────────────
    {
      id: 'node-8',
      type: 'ticket_add',
      position: { x: 400, y: 300 },
      data: {
        command: 'add',
      },
    },

    // ─── TICKET REMOVE USER ────────────────────────────────────────
    {
      id: 'node-9',
      type: 'ticket_remove',
      position: { x: 600, y: 300 },
      data: {
        command: 'remove',
      },
    },

    // ─── TICKET RENAME ────────────────────────────────────────────
    {
      id: 'node-10',
      type: 'ticket_rename',
      position: { x: 800, y: 300 },
      data: {
        command: 'rename',
      },
    },
  ],

  edges: [
    // Panel → Create
    { id: 'edge-1', source: 'node-1', target: 'node-2', sourceHandle: 'out', targetHandle: 'in' },
    
    // Create → Priority
    { id: 'edge-2', source: 'node-2', target: 'node-3', sourceHandle: 'out', targetHandle: 'in' },
    
    // Priority → Close
    { id: 'edge-3', source: 'node-3', target: 'node-6', sourceHandle: 'out', targetHandle: 'in' },
    
    // Close → Log
    { id: 'edge-4', source: 'node-6', target: 'node-7', sourceHandle: 'out', targetHandle: 'in' },
    
    // Create → Add User
    { id: 'edge-5', source: 'node-2', target: 'node-8', sourceHandle: 'out', targetHandle: 'in' },
    
    // Add → Remove
    { id: 'edge-6', source: 'node-8', target: 'node-9', sourceHandle: 'out', targetHandle: 'in' },
    
    // Remove → Rename
    { id: 'edge-7', source: 'node-9', target: 'node-10', sourceHandle: 'out', targetHandle: 'in' },
    
    // Lock branch
    { id: 'edge-8', source: 'node-3', target: 'node-4', sourceHandle: 'out', targetHandle: 'in' },
    
    // Lock → Unlock
    { id: 'edge-9', source: 'node-4', target: 'node-5', sourceHandle: 'out', targetHandle: 'in' },
  ],
};

// ─── WORKFLOW DESCRIPTION ──────────────────────────────────────────────

/*
SETUP INSTRUCTIONS:

1. PANEL CONFIGURATION
   └─ Create buttons for each category (support, billing, etc.)
   └─ Customize embed title, description, colors
   └─ Set button labels

2. CHANNEL CONFIGURATION
   └─ Set categoryChannel: Where tickets are created (category ID)
   └─ Set logChannel: Where events are logged
   └─ Set transcriptChannel: Where transcripts are stored

3. TICKET CREATION SETTINGS
   └─ maxTicketsPerUser: 1-10 tickets per user
   └─ ticketNaming: Format for ticket channel names
   └─ allowDuplicates: Allow multiple tickets per user
   └─ welcomeMessage: Message posted in new tickets

4. CLOSE SETTINGS
   └─ requireConfirmation: Show confirmation buttons
   └─ generateTranscript: Save HTML transcripts
   └─ deleteDelay: Seconds before channel deletion

5. STAFF WORKFLOW
   After ticket created:
   
   a) Add support staff: Use ticket_add node
      └─ Command: !add @staffmember
   
   b) Set priority: Use ticket_priority node
      └─ Command: !priority high
   
   c) Lock if needed: Use ticket_lock node
      └─ Command: !lock
   
   d) Unlock when ready: Use ticket_unlock node
      └─ Command: !unlock
   
   e) Close ticket: Use ticket_close node
      └─ Command: !close
   
   f) Events logged: Automatically logged to log channel

COMMAND REFERENCE:
├─ !ticketpanel       - Create panel (admin)
├─ /ticket create     - Create ticket
├─ !add @user         - Add user to ticket
├─ !remove @user      - Remove user from ticket
├─ !rename newname    - Rename ticket
├─ !priority [level]  - Set priority
├─ !lock              - Lock ticket
├─ !unlock            - Unlock ticket
├─ !close             - Close ticket
└─ !tickets           - List all tickets

PRIORITY LEVELS:
├─ low     (🔵 Blue)
├─ medium  (🟡 Orange)
├─ high    (🔴 Red)
└─ urgent  (🚨 Dark Red)

DATABASE:
└─ File: data/tickets.json
   Stores: ID, owner, created time, priority, staff, transcripts

TRANSCRIPTS:
└─ Generated as: data/transcripts/TKT-ID.html
   Contains: All messages, embeds, attachments, timestamps

ERROR HANDLING:
├─ User already has open ticket
├─ Missing permissions
├─ Invalid channel IDs
├─ Failed channel creation
└─ Transcript generation errors (all graceful)
*/

// ─── INTEGRATION CODE ───────────────────────────────────────────────

/*
// 1. Register plugins
const plugins = [
  require('./plugins/ticketsystem/ticket_panel'),
  require('./plugins/ticketsystem/ticket_create'),
  require('./plugins/ticketsystem/ticket_close'),
  require('./plugins/ticketsystem/ticket_add'),
  require('./plugins/ticketsystem/ticket_remove'),
  require('./plugins/ticketsystem/ticket_rename'),
  require('./plugins/ticketsystem/ticket_lock'),
  require('./plugins/ticketsystem/ticket_unlock'),
  require('./plugins/ticketsystem/ticket_priority'),
  require('./plugins/ticketsystem/ticket_log'),
];

for (const plugin of plugins) {
  registry.register(plugin.meta.name.toLowerCase().replace(/ /g, '_'), plugin);
}

// 2. Setup interaction handler
const TicketInteractionHandler = require('./plugins/ticketsystem/interactionHandler');
const ticketHandler = new TicketInteractionHandler(client);

client.on('interactionCreate', async (interaction) => {
  await ticketHandler.handle(interaction).catch(console.error);
});

// 3. Load workflow
const executionEngine = new ExecutionEngine(registry);
await executionEngine.execute(WORKFLOW, {
  client,
  guild: message.guild,
  user: message.author,
});
*/

module.exports = {
  WORKFLOW,
  name: 'Ticket System Workflow',
  version: '1.0.0',
  description: 'Complete ticket system workflow for Discord bot builder',
};
