const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const Party = require('../models/party');
const mongoose = require('mongoose');
const { transformPartyForResponse } = require('../utils/transformers');

// Register a user or update existing user
const registerUser = async (req, res, next) => {
  const { username, partyID: requestedPartyID } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    console.warn(`Invalid username in registration request: ${username}`);
    return res.status(400).json({ error: "Valid username is required" });
  }

  try {
    // Check for existing username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // Decide how to handle existing users. For now, returning conflict.
      // Alternative: update lastActive, potentially join party, return existing user data.
      console.warn(`Attempted registration for existing username: ${username}`);
      return res.status(409).json({ error: 'Username already exists.' });
    }

    // Create new user (Mongoose defaults will apply)
    let user = new User({ username });
    console.log(`Creating new user ${username}`);

    let party = null;

    // Handle party logic
    if (requestedPartyID) {
      // User wants to join an existing party
      user.partyID = requestedPartyID;
      await user.save(); // Save user first to get _id

      party = await Party.findOne({ id: requestedPartyID });
      if (party) {
        // Check for duplicates using user._id
        const isAlreadyMember = party.members.some(member =>
          member.user && member.user.toString() === user._id.toString()
        );

        if (!isAlreadyMember) {
          // Add user reference to party
          party.members.push({
            user: user._id,
            joined: new Date() // Corrected Date usage
          });
          party.markModified('members');
          await party.save();
          console.log(`Added user ${username} to existing party ${requestedPartyID}`);
        } else {
          console.log(`User ${username} already a member of party ${requestedPartyID}`);
        }
      } else {
        // Requested party not found - cleanup potential dangling user.partyID?
        // Or perhaps transaction is needed for atomicity. For now, return error.
        console.warn(`Requested party ID ${requestedPartyID} not found for user ${username}`);
        // Rollback user save or delete user? For simplicity, just return error.
        // await User.findByIdAndDelete(user._id); // Example rollback
        return res.status(404).json({ error: `Party with ID ${requestedPartyID} not found` });
      }
    } else {
      // Create a new party for the user
      const newPartyID = uuidv4();
      user.partyID = newPartyID;
      await user.save(); // Save user first to get _id

      party = new Party({
        id: newPartyID,
        createdBy: username,
        members: [{
          user: user._id,
          joined: new Date() // Add joined field
        }]
      });
      await party.save();
      console.log(`Created new party ${newPartyID} for user ${username}`);
    }

    // Populate party members for the response
    // Ensure population happens *after* potential modifications
    const populatedParty = await Party.findById(party._id).populate('members.user');


    // Prepare response data using the transformation function
    const responseData = {
      userID: user._id, // Use userID to match previous response key
      username: user.username,
      score: user.score, // Mongoose defaults apply here
      partyID: user.partyID,
      party: transformPartyForResponse(populatedParty) // Use transformed data
    };


    res.json(responseData);

  } catch (error) {
    console.error(`Error during user registration: ${error.message}`, error);
    // Check for duplicate key errors (username is unique)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    next(error);
  }
};

// Utility function to update a user's score
// Returns updated user and party data
const updateUserScoreById = async (userId, isCorrect) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    // Update user score
    if (isCorrect) {
      user.score.correct += 1;
    } else {
      user.score.incorrect += 1;
    }
    user.lastActive = new Date();
    await user.save();
    
    // Get party data if user is in a party
    let partyData = null;
    if (user.partyID) {
      const party = await Party.findOne({ id: user.partyID }).populate('members.user');
      
      if (party) {
        // Check if user is actually in the members list
        const memberExists = party.members.some(m => 
          m.user && m.user._id.toString() === user._id.toString()
        );
        
        if (!memberExists) {
          console.warn(`User ${user.username} has partyID ${user.partyID} but is not listed in party members.`);
          // The user has a partyID but isn't in the party members - could add them if needed
        }
        
        // Get transformed party data
        partyData = transformPartyForResponse(party);
      }
    }
    
    return {
      user: {
        userID: user._id,
        username: user.username,
        score: user.score
      },
      party: partyData
    };
  } catch (error) {
    console.error(`Error updating user score: ${error.message}`);
    throw error;
  }
};

// Get user by ID - new endpoint matching the requested format
const getUserById = async (req, res, next) => {
  const { id: userId } = req.params; 

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  try {
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      console.warn(`User ID not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Base response without party
    const response = {
      userID: targetUser._id,
      username: targetUser.username,
      score: targetUser.score,
      partyID: targetUser.partyID
    };

    // If user has a party, fetch, populate, and transform it
    if (targetUser.partyID) {
      const party = await Party.findOne({ id: targetUser.partyID }).populate('members.user');

      if (party) {
        response.party = transformPartyForResponse(party);
      }
    }

    res.json(response);
  } catch (error) {
    console.error(`Error fetching user by ID: ${error.message}`, error);
    next(error);
  }
};

module.exports = {
  registerUser,
  getUserById,
  updateUserScoreById, // Export to be used by other controllers
  // updateUserScore removed as it's no longer needed as an endpoint
}; 