const mongoose = require('mongoose');

// Define score schema inline since score.js might not exist
const scoreSchema = new mongoose.Schema({
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 }
}, { _id: false }); // Prevent Mongoose from creating an _id for subdocuments

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  score: { type: scoreSchema, default: () => ({ correct: 0, incorrect: 0 }) },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  partyID: { type: String, default: null, index: true } // Index for faster party lookups
});

const User = mongoose.model('User', userSchema);

module.exports = User; 