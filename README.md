# Globetrotter API

Backend API for Globetrotter geography quiz application.

## Project Structure

The codebase is organized using a simple modular architecture:

```
├── server.js           # Express app and server entry point
├── controllers/        # Business logic for handling requests
├── data.json           # Destinations data
├── models/             # Database models
├── routes/             # API routes
└── utils/              # Utility functions
```

## Prerequisites

- Node.js 16+ 
- MongoDB instance

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/globetrotter
```

For production deployment, update the values accordingly:

```
PORT=3001
NODE_ENV=production
MONGODB_URI=<your-mongodb-connection-string>
```

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Development

Start the development server with hot reloading:

```bash
npm run dev
```

## Production Deployment

```bash
npm install --production
npm start
```

## API Documentation

### Health Check
- `GET /api/health` - Check if the API is running

### Destinations
- `GET /api/destinations/random` - Get a random destination with options
- `POST /api/destinations/answer` - Check an answer

### Users
- `POST /api/users/register` - Register or get existing user
- `GET /api/users/challenge/:challengeId` - Get user by challenge ID
- `PUT /api/users/:username/score` - Update user score

### Parties
- `GET /api/parties/:partyId` - Get party info

## License

ISC
