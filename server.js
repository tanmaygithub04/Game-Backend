const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

// Load destinations data
const dataPath = path.join(__dirname, "data.json");
let destinations = [];
try {
  const rawData = fs.readFileSync(dataPath);
  destinations = JSON.parse(rawData);
} catch (error) {
  console.error("Error reading or parsing data.json:", error);
}

// In-memory storage
const users = new Map();
const parties = new Map();

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
app.post("/api/users/register", (req, res) => {
  const { username, partyId } = req.body;
  
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: "Valid username is required" });
  }

  const userId = crypto.randomUUID();
  const challengeId = crypto.randomBytes(8).toString('hex');
  
  let user = users.get(username);
  if (user) {
    user.score = { correct: 0, incorrect: 0 };
    user.lastActive = new Date();
  } else {
    user = {
      id: userId,
      username,
      score: { correct: 0, incorrect: 0 },
      challengeId,
      createdAt: new Date(),
      lastActive: new Date(),
      partyId: null
    };
  }
  
  if (partyId && parties.has(partyId)) {
    const party = parties.get(partyId);
    if (!party.members.some(member => member.username === username)) {
      party.members.push({
        username,
        score: { correct: 0, incorrect: 0 },
        joinedAt: new Date()
      });
    }
    user.partyId = partyId;
  } else if (!partyId) {
    const newPartyId = crypto.randomBytes(8).toString('hex');
    const party = {
      id: newPartyId,
      createdBy: username,
      createdAt: new Date(),
      members: [{
        username,
        score: { correct: 0, incorrect: 0 },
        joinedAt: new Date()
      }]
    };
    parties.set(newPartyId, party);
    user.partyId = newPartyId;
  }
  
  users.set(username, user);
  
  const responseData = {
    username: user.username,
    score: user.score,
    challengeId: user.challengeId,
    partyId: user.partyId
  };
  
  if (user.partyId && parties.has(user.partyId)) {
    const party = parties.get(user.partyId);
    responseData.party = {
      id: user.partyId,
      createdBy: party.createdBy,
      members: party.members
    };
  }
  
  res.json(responseData);
});

// Get user by challenge ID
app.get("/api/users/challenge/:challengeId", (req, res) => {
  const { challengeId } = req.params;
  
  let targetUser = null;
  for (const user of users.values()) {
    if (user.challengeId === challengeId) {
      targetUser = user;
      break;
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  
  const response = {
    username: targetUser.username,
    score: targetUser.score,
    challengeId: targetUser.challengeId
  };
  
  if (targetUser.partyId) {
    const party = parties.get(targetUser.partyId);
    if (party) {
      response.party = {
        id: targetUser.partyId,
        createdBy: party.createdBy,
        members: party.members
      };
    }
  }
  
  res.json(response);
});

// Get party info
app.get("/api/parties/:partyId", (req, res) => {
  const { partyId } = req.params;
  
  if (!parties.has(partyId)) {
    return res.status(404).json({ error: "Party not found" });
  }
  
  const party = parties.get(partyId);
  
  res.json({
    id: party.id,
    createdBy: party.createdBy,
    createdAt: party.createdAt,
    members: party.members
  });
});

// Update user score
app.put("/api/users/:username/score", (req, res) => {
  const { username } = req.params;
  const { correct } = req.body;
  
  if (!users.has(username)) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = users.get(username);
  
  if (correct) {
    user.score.correct += 1;
  } else {
    user.score.incorrect += 1;
  }

  users.set(username, user);
  
  // Update user's score in any party they belong to
  if (user.partyId && parties.has(user.partyId)) {
    const party = parties.get(user.partyId);
    const memberIndex = party.members.findIndex(m => m.username === username);
    
    if (memberIndex !== -1) {
      if (correct) {
        party.members[memberIndex].score.correct += 1;
      } else {
        party.members[memberIndex].score.incorrect += 1;
      }
      parties.set(user.partyId, party);
    }
  }
  
  const response = { score: user.score };
  
  // Include party data if user is in a party
  if (user.partyId && parties.has(user.partyId)) {
    response.party = {
      id: user.partyId,
      members: parties.get(user.partyId).members
    };
  }
  
  res.json(response);
});

// Error handling middleware
app.use((err, req, res, next) => {
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
