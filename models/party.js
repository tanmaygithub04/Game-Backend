const mongoose = require('mongoose');

// Party schema
const partySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true }, // Use the crypto-generated ID
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        joined: { type: Date, default: Date.now }
    }]
});

const Party = mongoose.model('Party', partySchema);

module.exports = Party; 