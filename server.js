const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { loadDestinations } = require('./utils/dataLoader');
const apiRoutes = require('./routes');
const destinationController = require('./controllers/destinationController');
const dotenv = require('dotenv');
dotenv.config();
// Initialize Express app
const app = express();

// Basic CORS setup
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Something went wrong!' : err.message
  });
});

// Port to listen on
const port = process.env.PORT || 3001;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // Load destinations data
    const destinationsData = await loadDestinations();
    destinationController.initializeDestinations(destinationsData);
    
    // Start listening
    app.listen(port, () => {
      console.log(`Server listening at port: ${port}`);
    });
    
    console.log('Application initialized successfully');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

// Export for testing purposes
module.exports = { app, startServer };


