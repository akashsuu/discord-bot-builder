const mongoose = require('mongoose');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    claimedBy: { type: String, default: null },
    replyMode: { type: String, enum: ['normal', 'anonymous'], default: 'normal' },
    staffModes: { type: Map, of: String, default: new Map() },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
    messages: [
        {
            senderId: String,
            senderName: String,
            content: String,
            timestamp: { type: Date, default: Date.now },
            isStaff: { type: Boolean, default: false }
        }
    ]
});

module.exports = mongoose.model('Ticket', ticketSchema);
