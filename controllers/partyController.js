const Party = require('../models/party');
const User = require('../models/user');
const mongoose = require('mongoose');
const { transformPartyForResponse } = require('../utils/transformers');

// Get party by ID
const getPartyById = async (req, res, next) => {
  const { id: partyID } = req.params;

  if (!partyID) {
    return res.status(400).json({ error: "Party ID is required" });
  }

  try {
    // Find party by custom ID and populate members
    const party = await Party.findOne({ id: partyID }).populate('members.user');

    if (!party) {
      console.warn(`Party not found: ${partyID}`);
      return res.status(404).json({ error: "Party not found" });
    }

    // Transform the populated data before sending
    const formattedParty = transformPartyForResponse(party);
    res.json(formattedParty);
  } catch (error) {
    console.error(`Error fetching party info: ${error.message}`, error);
    next(error);
  }
};

// Helper: Join user to a party
const joinParty = async (req, res, next) => {
  const { partyID } = req.params;
  const { userId } = req.body;

  if (!partyID) {
    return res.status(400).json({ error: "Party ID is required" });
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Valid user ID is required" });
  }

  try {
    const party = await Party.findOne({ id: partyID });
    if (!party) {
      console.warn(`Join attempt for non-existent party: ${partyID}`);
      return res.status(404).json({ error: "Party not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn(`Join attempt with non-existent user: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already in party
    const isMember = party.members.some(member => 
      member.user && member.user.toString() === userId
    );

    if (isMember) {
      console.log(`User ${userId} is already a member of party ${partyID}`);
      return res.status(409).json({ error: "User is already in this party" });
    }

    // If user is in a different party, remove them from that party
    if (user.partyID && user.partyID !== partyID) {
      const oldParty = await Party.findOne({ id: user.partyID });
      if (oldParty) {
        oldParty.members = oldParty.members.filter(member => 
          !member.user || member.user.toString() !== userId
        );
        await oldParty.save();
        console.log(`Removed user ${userId} from previous party ${user.partyID}`);
      }
    }

    // Update user's party ID
    user.partyID = partyID;
    await user.save();

    // Add user to party
    party.members.push({
      user: userId,
      joined: new Date()
    });
    party.lastActive = new Date();
    await party.save();

    console.log(`User ${userId} joined party ${partyID}`);
    
    // Return complete party data with members
    const updatedParty = await Party.findOne({ id: partyID }).populate('members.user');
    
    res.json(transformPartyForResponse(updatedParty));
  } catch (error) {
    console.error(`Error joining party: ${error.message}`);
    next(error);
  }
};

// Helper: Leave party
const leaveParty = async (req, res, next) => {
  const { partyID } = req.params;
  const { userId } = req.body;

  if (!partyID) {
    return res.status(400).json({ error: "Party ID is required" });
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Valid user ID is required" });
  }

  try {
    const party = await Party.findOne({ id: partyID });
    if (!party) {
      console.warn(`Leave attempt for non-existent party: ${partyID}`);
      return res.status(404).json({ error: "Party not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn(`Leave attempt with non-existent user: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is in the party
    const memberIndex = party.members.findIndex(member => 
      member.user && member.user.toString() === userId
    );

    if (memberIndex === -1) {
      console.log(`User ${userId} is not a member of party ${partyID}`);
      return res.status(409).json({ error: "User is not in this party" });
    }

    // Remove user from party
    party.members.splice(memberIndex, 1);
    party.lastActive = new Date();
    await party.save();

    // Update user's party ID
    user.partyID = null;
    await user.save();

    console.log(`User ${userId} left party ${partyID}`);
    
    // If party is now empty, delete it
    if (party.members.length === 0) {
      await Party.findByIdAndDelete(party._id);
      console.log(`Deleted empty party ${partyID}`);
      return res.json({ message: "Left party successfully. Party was deleted as it's now empty." });
    }
    
    // Return updated party data
    const updatedParty = await Party.findOne({ id: partyID }).populate('members.user');
    
    res.json({ 
      message: "Left party successfully",
      party: transformPartyForResponse(updatedParty)
    });
  } catch (error) {
    console.error(`Error leaving party: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getPartyById,
  joinParty,
  leaveParty
}; 