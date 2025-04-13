// --- Mongoose Schemas and Models ---

const mongoose = require("mongoose");


const scoreSchema = new mongoose.Schema({
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 }
  }, { _id: false }); // Prevent Mongoose from creating an _id for the subdocument
  
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    score: { type: scoreSchema, default: () => ({ correct: 0, incorrect: 0 }) },
    challengeId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    partyId: { type: String, default: null, index: true } // Index for faster party lookups
  });
  
const partyMemberSchema = new mongoose.Schema({
    username: { type: String, required: true },
    score: { type: scoreSchema, default: () => ({ correct: 0, incorrect: 0 }) },
    joinedAt: { type: Date, default: Date.now }
  }, { _id: false });
  
  const partySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true }, // Use the crypto-generated ID
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    members: [partyMemberSchema]
  });

module.exports = {partyMemberSchema , partySchema , userSchema}
