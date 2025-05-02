const express = require('express');
const router = express.Router();
const destinationRoutes = require('./destinationRoutes');
const userRoutes = require('./userRoutes');
const partyRoutes = require('./partyRoutes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// API routes
router.use('/destinations', destinationRoutes);
router.use('/users', userRoutes);
router.use('/parties', partyRoutes);

module.exports = router; 