const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS for both development and production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, /localhost:\d+$/] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err}`);
});
// --- End MongoDB Connection ---

// --- Mongoose Schemas and Models ---
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

const User = mongoose.model('User', userSchema);
const Party = mongoose.model('Party', partySchema);
// --- End Mongoose Schemas and Models ---


// Load destinations data
const dataPath = path.join(__dirname, "data.json");
let destinations = [];
try {
  const rawData = fs.readFileSync(dataPath);
  destinations = JSON.parse(rawData);
} catch (error) {
  console.error("Error reading or parsing data.json:", error);
}



app.get('/api/health', (req, res) => {
  // Add CORS headers for the health endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
}); 


// Endpoint to get a random destination with multiple choice options
app.get("/api/destinations/random", (req, res) => {
  if (destinations.length === 0) {
    return res.status(500).json({ error: "No destinations available" });
  }

  const randomIndex = Math.floor(Math.random() * destinations.length);
  const correctDestination = destinations[randomIndex];
  const numClues = Math.random() < 0.5 ? 1 : 2;
  const selectedClues = [...correctDestination.clues]
    .sort(() => 0.5 - Math.random())
    .slice(0, numClues);

  const options = [correctDestination.city];
  const incorrectDestinations = destinations.filter((_, index) => index !== randomIndex);
  
  while (options.length < 4 && incorrectDestinations.length > 0) {
    const incorrectIndex = Math.floor(Math.random() * incorrectDestinations.length);
    const incorrectCity = incorrectDestinations.splice(incorrectIndex, 1)[0].city;
    if (!options.includes(incorrectCity)) {
      options.push(incorrectCity);
    }
  }

  res.json({
    id: randomIndex,
    clues: selectedClues,
    options: options.sort(() => 0.5 - Math.random()),
  });
});

// Answer checking endpoint
app.post("/api/destinations/answer", (req, res) => {
  const { destinationId, userAnswer } = req.body;

  if (destinationId === undefined || !userAnswer || destinations[destinationId] === undefined) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const correctDestination = destinations[destinationId];
  const isCorrect = correctDestination.city === userAnswer;
  const funFact = correctDestination.fun_fact[Math.floor(Math.random() * correctDestination.fun_fact.length)];

  res.json({
    correct: isCorrect,
    correctAnswer: correctDestination.city,
    funFact: funFact,
  });
});

// Endpoint to register a user or get existing user
app.post("/api/users/register", async (req, res, next) => { // Added async and next
  const { username, partyId: requestedPartyId } = req.body; // Renamed partyId to avoid conflict

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: "Valid username is required" });
  }

  try {
    let user = await User.findOne({ username });
    let party = null;
    let finalPartyId = null;

    if (user) {
      // User exists, reset score and update activity
      user.score = { correct: 0, incorrect: 0 };
      user.lastActive = new Date();
      // Keep existing challengeId and partyId unless a new party is requested/created
    } else {
      // New user
      const challengeId = crypto.randomBytes(8).toString('hex');
      user = new User({
        username,
        challengeId,
        score: { correct: 0, incorrect: 0 },
        lastActive: new Date(),
        partyId: null // Will be set below if needed
      });
    }

    // Handle party logic
    if (requestedPartyId) {
      party = await Party.findOne({ id: requestedPartyId });
      if (party) {
        // Add user to existing party if not already a member
        const memberExists = party.members.some(member => member.username === username);
        if (!memberExists) {
          party.members.push({
            username,
            score: { correct: 0, incorrect: 0 }, // Initialize score in party
            joinedAt: new Date()
          });
          await party.save();
        }
        finalPartyId = requestedPartyId;
      } else {
        // Requested party not found - potentially create a new one or handle error
        // For now, let's ignore invalid requestedPartyId and proceed without a party
        console.warn(`Requested party ID ${requestedPartyId} not found for user ${username}.`);
        finalPartyId = null; // Ensure user isn't assigned to a non-existent party
      }
    } else if (!user.partyId) { // Only create a new party if user doesn't have one AND didn't request one
      // Create a new party for the user
      const newPartyId = crypto.randomBytes(8).toString('hex');
      party = new Party({
        id: newPartyId,
        createdBy: username,
        members: [{
          username,
          score: { correct: 0, incorrect: 0 },
          joinedAt: new Date()
        }]
      });
      await party.save();
      finalPartyId = newPartyId;
    } else {
      // User exists and already has a partyId, or requested an invalid one
      finalPartyId = user.partyId; // Keep existing party or null if request was invalid
    }

    user.partyId = finalPartyId; // Assign the determined party ID
    await user.save(); // Save user (new or updated)

    // Prepare response data
    const responseData = {
      username: user.username,
      score: user.score,
      challengeId: user.challengeId,
      partyId: user.partyId
    };

    // Fetch party details again if a partyId is assigned
    if (user.partyId) {
       const currentParty = await Party.findOne({ id: user.partyId });
       if (currentParty) {
           responseData.party = {
               id: currentParty.id,
               createdBy: currentParty.createdBy,
               members: currentParty.members
           };
       }
    }

    res.json(responseData);

  } catch (error) {
    console.error("Error during user registration:", error);
    // Check for duplicate key errors (username or challengeId)
    if (error.code === 11000) {
        return res.status(409).json({ error: 'Username or challenge ID already exists.' });
    }
    next(error); // Pass other errors to the generic error handler
  }
});

// Get user by challenge ID
app.get("/api/users/challenge/:challengeId", async (req, res, next) => { // Added async and next
  const { challengeId } = req.params;

  try {
    const targetUser = await User.findOne({ challengeId });

    if (!targetUser) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const response = {
      username: targetUser.username,
      score: targetUser.score,
      challengeId: targetUser.challengeId,
      partyId: targetUser.partyId // Include partyId
    };

    if (targetUser.partyId) {
      const party = await Party.findOne({ id: targetUser.partyId });
      if (party) {
        response.party = {
          id: party.id, // Use party.id which is the unique string ID
          createdBy: party.createdBy,
          members: party.members
        };
      } else {
         console.warn(`Party ${targetUser.partyId} not found for user ${targetUser.username} during challenge lookup.`);
         // Optionally clear the user's partyId if it's invalid
         // targetUser.partyId = null;
         // await targetUser.save();
      }
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching user by challenge ID:", error);
    next(error);
  }
});

// Get party info
app.get("/api/parties/:partyId", async (req, res, next) => { // Added async and next
  const { partyId } = req.params;

  try {
    const party = await Party.findOne({ id: partyId }); // Find by the custom 'id' field

    if (!party) {
      return res.status(404).json({ error: "Party not found" });
    }

    res.json({
      id: party.id,
      createdBy: party.createdBy,
      createdAt: party.createdAt,
      members: party.members
    });
  } catch (error) {
    console.error("Error fetching party info:", error);
    next(error);
  }
});

// Update user score
app.put("/api/users/:username/score", async (req, res, next) => { // Added async and next
  const { username } = req.params;
  const { correct } = req.body; // Expecting { correct: boolean }

  if (typeof correct !== 'boolean') {
      return res.status(400).json({ error: "Invalid request body: 'correct' field (boolean) is required." });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user score
    if (correct) {
      user.score.correct += 1;
    } else {
      user.score.incorrect += 1;
    }
    user.lastActive = new Date(); // Update activity timestamp
    await user.save();

    let partyData = null;
    // Update user's score in their party, if they belong to one
    if (user.partyId) {
      const party = await Party.findOne({ id: user.partyId });
      if (party) {
        const memberIndex = party.members.findIndex(m => m.username === username);
        if (memberIndex !== -1) {
          if (correct) {
            party.members[memberIndex].score.correct += 1;
          } else {
            party.members[memberIndex].score.incorrect += 1;
          }
          // Mark members array as modified for Mongoose to save the change
          party.markModified('members');
          await party.save();
          partyData = { // Prepare party data for response
              id: party.id,
              members: party.members
          };
        } else {
             console.warn(`User ${username} found in party ${user.partyId} document, but not in members array.`);
        }
      } else {
          console.warn(`Party ${user.partyId} not found for user ${username} during score update.`);
          // Optionally clear the user's partyId if it's invalid
          // user.partyId = null;
          // await user.save();
      }
    }

    const response = { score: user.score };
    if (partyData) {
        response.party = partyData; // Include updated party data in response
    }

    res.json(response);

  } catch (error) {
    console.error("Error updating user score:", error);
    next(error);
  }
});

// Error handling middleware - Keep this generic one
app.use((err, req, res, next) => { // Ensure 'next' is included
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

module.exports = app; // Export for potential testing
