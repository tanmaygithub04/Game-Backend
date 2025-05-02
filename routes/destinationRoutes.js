const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');

// Get a random destination with options
router.get('/random', destinationController.getRandomDestination);

// Check an answer
router.post('/answer', destinationController.checkAnswer);

module.exports = router; 