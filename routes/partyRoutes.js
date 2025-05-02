const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');

// Get party by ID
router.get('/:id', partyController.getPartyById);

// Join a party
router.post('/:partyID/join', partyController.joinParty);

// Leave a party
router.post('/:partyID/leave', partyController.leaveParty);

module.exports = router; 