const fs = require('fs');
const path = require('path');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async (ticket, client) => {
    const guild = client.guilds.cache.get(client.config?.guildId || require('../config').guildId);
    const user = await client.users.fetch(ticket.userId).catch(() => ({ tag: 'Unknown User' }));

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Transcript - ${ticket.ticketId}</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #36393f; color: #dcddde; padding: 20px; }
            .message { border-bottom: 1px solid #4f545c; padding: 10px 0; }
            .sender { font-weight: bold; color: #fff; }
            .timestamp { font-size: 0.8em; color: #72767d; }
            .content { margin-top: 5px; }
            .staff { color: #00ff00; }
            .user { color: #00b0f4; }
        </style>
    </head>
    <body>
        <h1>Ticket Transcript: ${ticket.ticketId}</h1>
        <p>User: ${user.tag} (${ticket.userId})</p>
        <p>Status: ${ticket.status.toUpperCase()}</p>
        <p>Claimed By: ${ticket.claimedBy ? (await client.users.fetch(ticket.claimedBy).then(u => u.tag).catch(() => ticket.claimedBy)) : 'None'}</p>
        <hr>
    `;

    for (const msg of ticket.messages) {
        html += `
        <div class="message">
            <span class="sender ${msg.isStaff ? 'staff' : 'user'}">${msg.senderName}</span>
            <span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>
            <div class="content">${msg.content.replace(/\n/g, '<br>')}</div>
        </div>
        `;
    }

    html += `
    </body>
    </html>
    `;

    const fileName = `transcript-${ticket.ticketId}.html`;
    return {
        file: Buffer.from(html),
        name: fileName
    };
};
