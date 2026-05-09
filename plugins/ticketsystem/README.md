# 🎫 Advanced Discord Ticket System Plugin Suite

**Complete production-ready ticket system for your Discord.js bot builder**

---

## 📋 Overview

This is a modular, scalable ticket system with 11 plugins that handle everything from ticket creation to transcripts. Fully compatible with your node-based architecture.

### ✨ Features

- ✅ **Panel System** - Interactive buttons for ticket creation
- ✅ **Multi-Category** - Support, billing, reports, partnerships, custom
- ✅ **Priority System** - Low/Medium/High/Urgent with visual indicators
- ✅ **User Management** - Add/remove users with permissions
- ✅ **Lock/Unlock** - Prevent messages while keeping visibility
- ✅ **Transcripts** - HTML transcripts with full message history
- ✅ **Logging** - Complete audit trail of all actions
- ✅ **Customizable** - Embed titles, colors, naming patterns
- ✅ **Database** - Lightweight JSON storage
- ✅ **Code Generation** - Export working bot.js code

---

## 📦 Plugin Structure

```
plugins/ticketsystem/
├── ticketHelpers.js              # Core utility functions
├── interactionHandler.js         # Button/menu handlers
├── EXAMPLE_BOT.js               # Complete bot example
├── ticket_panel/                # Panel creation
│   ├── plugin.json
│   └── index.js
├── ticket_create/               # Create tickets
│   ├── plugin.json
│   └── index.js
├── ticket_close/                # Close & transcripts
│   ├── plugin.json
│   └── index.js
├── ticket_add/                  # Add users
│   ├── plugin.json
│   └── index.js
├── ticket_remove/               # Remove users
│   ├── plugin.json
│   └── index.js
├── ticket_rename/               # Rename tickets
│   ├── plugin.json
│   └── index.js
├── ticket_lock/                 # Lock tickets
│   ├── plugin.json
│   └── index.js
├── ticket_unlock/               # Unlock tickets
│   ├── plugin.json
│   └── index.js
├── ticket_priority/             # Set priority
│   ├── plugin.json
│   └── index.js
└── ticket_log/                  # Audit logging
    ├── plugin.json
    └── index.js
```

---

## 🚀 Quick Start

### 1. Load Plugins in Your Bot

```javascript
const ticketPanel = require('./plugins/ticketsystem/ticket_panel');
const ticketCreate = require('./plugins/ticketsystem/ticket_create');
const ticketClose = require('./plugins/ticketsystem/ticket_close');
// ... load all plugins ...

registry.register('ticket_panel', ticketPanel);
registry.register('ticket_create', ticketCreate);
// etc.
```

### 2. Setup in Node Editor

1. Add **Ticket Panel** node to your flow
2. Configure category names and button labels
3. Add **Ticket Create** node as output
4. Chain with **Close**, **Lock**, **Priority** nodes as needed

### 3. Configure Channels

In node settings:
- **Log Channel**: ID of logging channel
- **Category Channel**: ID of ticket category
- **Transcript Channel**: ID for transcript storage

---

## 🎯 Plugin Details

### Ticket Panel
**Creates interactive button panel**

**Config:**
```json
{
  "embedTitle": "Support Tickets",
  "embedDescription": "Click a button below to create a ticket.",
  "embedColor": "#7289DA",
  "categories": "support,billing,report,partnership,other",
  "buttonLabels": "Create Support Ticket,Billing Issue,Report User,Partnership,Other"
}
```

**Commands:** `!ticketpanel`

---

### Ticket Create
**Creates ticket channels**

**Config:**
```json
{
  "categoryChannel": "CHANNEL_ID",
  "logChannel": "LOG_CHANNEL_ID",
  "maxTicketsPerUser": 1,
  "ticketNaming": "ticket-{username}",
  "allowDuplicates": false,
  "welcomeMessage": "Welcome to your ticket!"
}
```

**Triggers:** Button clicks from panel OR `/ticket create`

**Data Stored:**
- Ticket ID (TKT-timestamp)
- Owner ID
- Creation timestamp
- Priority (default: medium)
- Staff members list
- Locked status

---

### Ticket Close
**Close tickets with transcripts**

**Config:**
```json
{
  "requireConfirmation": true,
  "generateTranscript": true,
  "deleteDelay": 5,
  "transcriptChannel": "TRANSCRIPT_CHANNEL_ID"
}
```

**Commands:** `!close`

**Features:**
- Confirmation buttons
- HTML transcript generation
- Automatic channel deletion
- Transcript archival

---

### Ticket Add / Remove
**Manage ticket permissions**

**Commands:**
- `!add @user` - Add user to ticket
- `!remove @user` - Remove user from ticket

**Permissions Updated:**
- ViewChannel
- SendMessages
- ReadMessageHistory

---

### Ticket Rename
**Rename ticket channels**

**Command:** `!rename new-ticket-name`

---

### Ticket Lock / Unlock
**Control messaging**

**Commands:**
- `!lock` - Prevent sending messages
- `!unlock` - Restore permissions

**Effect:** Owner can view but cannot send

---

### Ticket Priority
**Set ticket priority level**

**Command:** `!priority [low|medium|high|urgent]`

**Visual Indicators:**
- 🔵 Low - Blue (#3498DB)
- 🟡 Medium - Orange (#F39C12)
- 🔴 High - Red (#E74C3C)
- 🚨 Urgent - Dark Red (#C0392B)

---

### Ticket Log
**Audit trail logging**

**Events Logged:**
- TICKET_CREATED
- TICKET_CLOSED
- TICKET_PRIORITY
- USER_ADDED
- USER_REMOVED
- TICKET_LOCKED
- TICKET_UNLOCKED

**Config:**
```json
{
  "logChannel": "LOG_CHANNEL_ID",
  "logCreation": true,
  "logClosing": true,
  "logActions": true
}
```

---

## 📊 Database Schema

**File:** `data/tickets.json`

```javascript
{
  "id": "TKT-1234567890-abc123",
  "guildId": "SERVER_ID",
  "channelId": "CHANNEL_ID",
  "ownerId": "USER_ID",
  "category": "support",
  "priority": "medium",
  "locked": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "closedAt": null,
  "claimedBy": "STAFF_ID",
  "staffMembers": ["STAFF_ID_1", "STAFF_ID_2"],
  "closedBy": null,
  "closeReason": null,
  "transcriptUrl": "/data/transcripts/TKT-123.html",
  "messages": []
}
```

---

## 🔌 Integration

### Add to Interaction Handler

```javascript
const TicketInteractionHandler = require('./plugins/ticketsystem/interactionHandler');
const ticketHandler = new TicketInteractionHandler(client);

client.on('interactionCreate', async (interaction) => {
  await ticketHandler.handle(interaction);
});
```

### With Message Commands

```javascript
client.on('messageCreate', async (message) => {
  // Buttons automatically handled via interaction handler
  
  // Commands still work:
  if (message.content === '!close') { /* ... */ }
  if (message.content.startsWith('!add')) { /* ... */ }
});
```

---

## 💾 Helper Functions

**ticketHelpers.js** provides utilities:

```javascript
// Load/Save
loadTickets()
saveTickets(tickets)

// Create
createTicketChannel(guild, user, category, categoryId, options)
createTicketRecord(guildId, channelId, ownerId, category)

// Query
getTicketByChannel(channelId)
getGuildTickets(guildId)
getUserTickets(guildId, userId)
hasOpenTicket(guildId, userId)

// Modify
closeTicket(channelId, reason, closedBy)
setPriority(channelId, priority)
addStaffMember(channelId, userId)
removeStaffMember(channelId, userId)

// Transcripts
generateTranscript(channel, ticketData)
saveTranscript(ticketId, html)

// Utilities
getPriorityColor(priority)
getPriorityEmoji(priority)
buildTicketEmbed(ticket, user)
```

---

## 📝 Transcript Generation

**HTML transcripts include:**
- All messages with timestamps
- Author information
- Embeds and attachments
- Clean, styled output
- Download link support

**Storage:**
- Default: `data/transcripts/TKT-ID.html`
- Optional: Post to transcript channel

---

## ⚙️ Node Editor Configuration

### Ticket Panel Node
- ✏️ Embed title
- ✏️ Embed description
- 🎨 Embed color
- 🖼️ Thumbnail URL
- ✏️ Footer text
- 📝 Category list (comma-separated)
- 🔘 Button labels

### Ticket Create Node
- 📂 Category channel ID
- 📋 Log channel ID
- 🔢 Max tickets per user (1-10)
- 📛 Naming format: `ticket-{username}`, `ticket-{number}`
- ☑️ Allow duplicates
- 💬 Welcome message

### Ticket Close Node
- ☑️ Require confirmation
- 📄 Generate transcript
- ⏱️ Delete delay (0-60 seconds)
- 📂 Transcript channel ID

### Ticket Log Node
- 📂 Log channel ID
- ☑️ Log creation events
- ☑️ Log closing events
- ☑️ Log all modifications

---

## 🔐 Permissions

**Bot requires:**
- `ManageChannels` - Create/delete channels
- `ManageRoles` - Manage permissions
- `SendMessages` - Post messages
- `ManageMessages` - Delete messages

**Node outputs:**
- `true` - Success
- `false` - Failure/skip

---

## 📤 Code Generation

Each plugin's `generateCode()` exports working JavaScript:

```javascript
// Exported code includes:
- Full helper functions
- Button handlers
- Modal support
- Error handling
- Transcript generation
```

---

## 🎮 Example Workflow

```
1. User clicks "Create Support Ticket" button
   ↓
2. System checks for existing tickets
   ↓
3. Creates channel with proper permissions
   ↓
4. Posts welcome embed
   ↓
5. Logs event to log channel
   ↓
6. Staff can: add users, set priority, lock/unlock
   ↓
7. User/Staff closes with confirmation
   ↓
8. Transcript generated and saved
   ↓
9. Channel deleted after delay
   ↓
10. Event logged with complete details
```

---

## 🐛 Troubleshooting

**Tickets not creating?**
- Check bot permissions in category
- Verify channel IDs are correct
- Check JSON file permissions

**Transcripts not generating?**
- Verify `data/transcripts/` directory exists
- Check message fetch permissions
- Review error logs

**Commands not working?**
- Ensure plugins are registered
- Check prefix matches config
- Verify message intent is enabled

---

## 📚 Reference

**Ticket Priorities:**
```
low     → 🔵 #3498DB
medium  → 🟡 #F39C12
high    → 🔴 #E74C3C
urgent  → 🚨 #C0392B
```

**Ticket States:**
```
open → locked/unlocked
     → priority: low/medium/high/urgent
     → claimed by staff member
     → closed with reason + transcript
```

---

## ✅ Production Checklist

- [ ] Configure log channel
- [ ] Set ticket category channel
- [ ] Set transcript channel
- [ ] Configure embed colors/titles
- [ ] Set max tickets per user
- [ ] Configure naming format
- [ ] Test ticket creation
- [ ] Test transcript generation
- [ ] Test user add/remove
- [ ] Test lock/unlock
- [ ] Test priority system
- [ ] Verify database file created

---

## 🤝 Integration Tips

1. **With moderation bot**: Log tickets in moderation audit channel
2. **With roles**: Require certain roles to claim tickets
3. **With database**: Replace JSON storage with MongoDB/PostgreSQL
4. **With webhooks**: Send ticket events to external systems
5. **With reactions**: Add reaction-based ticket actions

---

**Your ticket system is production-ready! 🚀**
