const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Register or get existing user
router.post('/register', userController.registerUser);

// Get user by ID ( this is for getting info for the challenger user )
router.get('/:id', userController.getUserById);

module.exports = router; 