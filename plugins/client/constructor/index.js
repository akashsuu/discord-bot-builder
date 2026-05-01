'use strict';

const { Client, GatewayIntentBits } = require("discord.js");

module.exports = {
  client: {

    async execute(node, _message, ctx, engine) {
      if (!node.data.token) {
        console.error("❌ No bot token provided");
        return;
      }

      // 🔹 Map intents
      const intentMap = {
        Guilds: GatewayIntentBits.Guilds,
        GuildMessages: GatewayIntentBits.GuildMessages,
        MessageContent: GatewayIntentBits.MessageContent,
        GuildMembers: GatewayIntentBits.GuildMembers,
        GuildVoiceStates: GatewayIntentBits.GuildVoiceStates
      };

      const intents = (node.data.intents || [])
        .map(i => intentMap[i])
        .filter(Boolean);

      // 🔹 Create client
      const client = new Client({ intents });

      // 🔹 Save to context
      if (ctx) {
        ctx.client = client;
      }

      // 🔹 Ready event
      client.once("ready", async () => {
        console.log(`✅ Logged in as ${client.user.tag}`);

        if (ctx) {
          ctx.clientReady = true;
        }

        // 🔥 Start flow after ready
        if (engine && engine.runNext) {
          await engine.runNext(node, { client });
        }
      });

      // 🔹 Login
      try {
        await client.login(node.data.token);
      } catch (err) {
        console.error("❌ Login failed:", err);
      }
    },

    generateCode(node) {
      return `
// ── Client Constructor ─────────────────────
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("Bot is ready!");
});

client.login("${node.data.token}");
`;
    }
  }
};