module.exports = { 
  botName: "ModMailX", // Name of the bot
  // This name will be used in bot and is mandatory.
  botPrefix: "?", // Prefix for bot commands
  // This prefix will be used to trigger bot commands.
  // Make sure to use a prefix that is not commonly used in your server.
  // For example, you can use "!" or "?" as prefix.
  // This is an example prefix. You can change it to any prefix you prefer.

  token: "YOUR_BOT_TOKEN_HERE", // Token of the bot
  // Get your bot token from https://discord.com/developers/applications
  // Make sure to enable the "Server Members Intent" and "Message Content Intent" in the bot settings.
  // These intents are required for the bot to work properly.
  // Do not share your bot token with anyone.

  clientId: "YOUR_CLIENT_ID_HERE", // Client ID of the bot
  // Get both token and client ID from https://discord.com/developers/applications

  guildId: "YOUR_GUILD_ID_HERE", // Guild id of your server :)
  // This is the server where the bot will operate.
  // Make sure the bot has permission to access this server.
   // Add all server IDs where the bot should stay here 
  // Bot will only work in this server. , it will not work in other servers.
  // Make sure the bot has admin permission in this server.
  // If someone add the bot to another server, it will automatically leave that server.

  serverName: "YourServerName", // Name of your server
  // This name will be used bot and is mandatory.

  ownerId: "YOUR_OWNER_ID_HERE", // id of the bot owner (you can put your userid here)
  // This owner will have access to owner commands.

  staffRole: "YOUR_STAFF_ROLE_ID_HERE", // id of the staff/mod role (users with this role can reply to tickets)
  // This role will be used to identify staff members who can reply to modmail tickets.
  // Make sure the bot has permission to add/remove this role to/from users.

  modmailCategory: "YOUR_MODMAIL_CATEGORY_ID_HERE", // ID of the modmail category
  // This category will be used to store modmail ticket channels.
  // Make sure the bot has permission to create channels in this category.

  mongoURI: "mongodb://username:password@host:port/database?options", // MongoDB URI
  // Get your MongoDB URI from https://www.mongodb.com/
  // Just signup and create a cluster, then get the connection string.

  ticketPrefix: "modmail-", // Prefix for modmail tickets
  // This prefix will be used to create ticket channels.
  // For example, if the prefix is "modmail-", a ticket channel for user "foil" will be "modmail-foil".

  transcriptChannel: "YOUR_TRANSCRIPT_CHANNEL_ID_HERE" // ID of the transcript channel
  // This channel will be used to store transcripts of modmail tickets.
  // Make sure the bot has permission to send messages in this channel.
  // This channel should be private to prevent unauthorized access.
}
