let destinations = [];
const { updateUserScoreById } = require('./userController');

// Initialize destinations data
const initializeDestinations = (destinationsData) => {
  destinations = destinationsData;
  console.log(`Loaded ${destinations.length} destinations`);
};

// Get a random destination with multiple choice options
const getRandomDestination = (req, res) => {
  if (destinations.length === 0) {
    console.error('No destinations available');
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

  const response = {
    id: randomIndex,
    clues: selectedClues,
    options: options.sort(() => 0.5 - Math.random()),
  };

  res.json(response);
};

// Check answer - now with user score update
const checkAnswer = async (req, res) => {
  const { destinationId, userAnswer, userID } = req.body;

  if (destinationId === undefined || !userAnswer || !userID || destinations[destinationId] === undefined) {
    console.warn(`Invalid answer check request: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ error: "Invalid request - required fields: destinationId, userAnswer, userID" });
  }

  const correctDestination = destinations[destinationId];
  const isCorrect = correctDestination.city === userAnswer;
  const funFact = correctDestination.fun_fact[Math.floor(Math.random() * correctDestination.fun_fact.length)];

  try {
    // Update user score using the utility function from userController
    const { user, party } = await updateUserScoreById(userID, isCorrect);

    // Prepare the response with score and party data
    const response = {
      correct: isCorrect,
      correctAnswer: correctDestination.city,
      funFact: funFact,
      updatedScore: user.score
    };

    // Include party data if available
    if (party) {
      response.party = party;
    }

    res.json(response);
  } catch (error) {
    console.error(`Error updating score for answer check: ${error.message}`);
    res.status(500).json({ 
      error: "Failed to update user score",
      correct: isCorrect,
      correctAnswer: correctDestination.city,
      funFact: funFact
    });
  }
};

module.exports = {
  initializeDestinations,
  getRandomDestination,
  checkAnswer
}; 