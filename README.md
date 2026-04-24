<<<<<<< HEAD
# ⚡ Discord Bot Builder

**Visual node-based Discord bot creator — no code required.**
Build, run, and export Discord bots by connecting nodes in a Blender-style editor.

> © Akashsuu Bot Builder — All rights reserved

---

## Features

- **Visual node editor** — drag, drop, and connect nodes on an infinite canvas
- **Live bot runner** — start and stop your bot directly inside the app
- **Code export** — generate a real, runnable `bot.js` file
- **Plugin system** — extend with custom node types
- **Auto-save** — project saves automatically every 2 seconds
- **Dark theme** — Blender-inspired UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 28 |
| UI Framework | React 18 |
| Node Editor | React Flow 11 |
| Discord API | discord.js 14 |
| Bundler | Webpack 5 + Babel |
| Storage | JSON project files |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

### Install

```bash
cd discord-bot-builder
npm install
```

### Run (development)

```bash
npm run dev
```

This builds the React frontend then opens the Electron window.

### Watch mode (live reload)

Open two terminals:

```bash
# Terminal 1 — rebuild on file changes
npm run watch

# Terminal 2 — start Electron after first build
npm start
```

---

## Project Structure

```
discord-bot-builder/
├── main.js                     Electron main process + IPC handlers
├── preload.js                  Secure contextBridge API surface
├── webpack.config.js
├── .babelrc
├── package.json
│
├── src/                        React frontend
│   ├── index.html
│   ├── index.jsx
│   ├── App.jsx
│   ├── context/
│   │   └── ProjectContext.jsx  Global state (screen, project, bot, logs)
│   ├── screens/
│   │   ├── HomeScreen.jsx      Create / Load project
│   │   ├── CreateProjectScreen.jsx
│   │   ├── TokenScreen.jsx     Discord bot token entry
│   │   └── EditorScreen.jsx    React Flow canvas
│   ├── nodes/
│   │   ├── EventMessageNode.jsx
│   │   ├── CustomCommandNode.jsx
│   │   ├── SendMessageNode.jsx
│   │   ├── ConditionBranchNode.jsx
│   │   └── nodeTypes.js        Node registry + palette metadata
│   ├── components/
│   │   ├── Toolbar.jsx         Run / Stop / Save / Export / Token
│   │   ├── NodePalette.jsx     Draggable node sidebar
│   │   └── LogPanel.jsx        Collapsible console output
│   └── styles/
│       └── index.css
│
├── backend/
│   ├── botRunner.js            discord.js execution engine (main process)
│   ├── codeExporter.js         Generates bot.js from node graph
│   └── pluginLoader.js         Loads /plugins/* at startup
│
└── plugins/
    └── ping_command/           Example plugin
        ├── plugin.json
        └── index.js
```

---

## Node Types

### ⚡ Message Event
Trigger node. Fires whenever a message is received in any channel the bot can see.
No inputs. One output: `message`.

### 💬 Custom Command
Checks if the incoming message starts with a command string.
If it matches, optionally sends a reply, then passes the message downstream.

| Field | Description |
|---|---|
| Command | e.g. `!hello` |
| Reply | e.g. `Hello {user}!` |

### 📤 Send Message
Sends a text message to the same channel the trigger came from.

| Field | Description |
|---|---|
| Text | Message content (supports variables) |

### 🔀 Condition Branch
Evaluates a condition and routes execution down a **True** or **False** path.

| Field | Options |
|---|---|
| Condition | `starts_with`, `contains`, `equals` |
| Value | The string to test against |

---

## Variable Substitution

Use these placeholders in **Reply** and **Text** fields:

| Variable | Replaced with |
|---|---|
| `{user}` | The sender's username |
| `{args}` | Everything after the command word |
| `{tag}` | The sender's full tag (`user#1234`) |
| `{channel}` | The channel name |

Example: `Hello {user}, you said: {args}` sent by `Alice` with `!greet world` →
`Hello Alice, you said: world`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + S` | Save project |
| `Delete` | Delete selected node or edge |
| `Scroll` | Zoom canvas |
| `Middle-click drag` | Pan canvas |

---

## Project File Format

Projects are stored as `project.json`:

```json
{
  "name": "My Bot",
  "token": "",
  "nodes": [
    {
      "id": "event_message_1",
      "type": "event_message",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "Message Event" }
    },
    {
      "id": "custom_command_1",
      "type": "custom_command",
      "position": { "x": 380, "y": 200 },
      "data": { "command": "!hello", "reply": "Hello {user}!" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "event_message_1",
      "sourceHandle": "output",
      "target": "custom_command_1",
      "targetHandle": "input"
    }
  ]
}
```

> **Security:** The token is stored locally only. It is never logged or transmitted anywhere.

---

## Plugin System

Extend the app with new node types by dropping a folder into `/plugins/`.

### Plugin structure

```
plugins/
└── my_plugin/
    ├── plugin.json
    └── index.js
```

### plugin.json

```json
{
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something cool",
  "author": "You",
  "icon": "🔌"
}
```

### index.js

```js
module.exports = {
  nodes: {
    my_node_type: {
      async execute(node, message) {
        // node.data contains your node's field values
        // message is a discord.js Message object
        // return true  → downstream nodes run
        // return false → stop this execution path
      },
      generateCode(node) {
        return `/* valid JS that uses the message variable */`;
      }
    }
  }
};
```

### Built-in example — `plugins/ping_command/`

Registers a `ping_command` node that responds to `!ping` with latency:

```js
module.exports = {
  nodes: {
    ping_command: {
      async execute(node, message) {
        if (message.content.trim().toLowerCase() !== '!ping') return false;
        const latency = Date.now() - message.createdTimestamp;
        await message.channel.send(`🏓 Pong! Latency: **${latency}ms**`);
        return true;
      },
      generateCode(node) {
        return `if (message.content.trim().toLowerCase() === "!ping") {
  const latency = Date.now() - message.createdTimestamp;
  message.channel.send(\`🏓 Pong! Latency: \${latency}ms\`);
}`;
      }
    }
  }
};
```

Plugins are loaded automatically at app startup — no registration needed.

---

## Exported Code

Clicking **📦 Export** generates a self-contained `bot.js`:

```js
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!hello")) {
    message.channel.send(`Hello ${message.author.username}!`);
  }
});

client.login("YOUR_BOT_TOKEN");
```

Run the exported file with:

```bash
npm install discord.js
node bot.js
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Build frontend then launch Electron |
| `npm run build` | One-time webpack build (development mode) |
| `npm run watch` | Webpack in watch mode (rebuilds on change) |
| `npm start` | Launch Electron (requires prior build) |

---

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → Bot → add a bot
3. Under **Privileged Gateway Intents**, enable **Message Content Intent**
4. Copy the token and paste it in the app via the **🔑 Token** button
5. Invite the bot to your server using OAuth2 → URL Generator (scopes: `bot`)

---

## License

© Akashsuu Bot Builder — All rights reserved.
=======
# discord-bot-builder
Build, run, and export Discord bots by connecting nodes in a nodes-style editor.
>>>>>>> 5b89619ab12b1c7a959eae72836e801cb3b1665b
