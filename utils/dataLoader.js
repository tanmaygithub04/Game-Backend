const fs = require('fs').promises;
const path = require('path');

// Load destinations data asynchronously
const loadDestinations = async () => {
  try {
    const dataPath = path.join(__dirname, '..', 'data.json');
    const rawData = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading or parsing data.json:', error);
    return [];
  }
};

module.exports = { loadDestinations }; 