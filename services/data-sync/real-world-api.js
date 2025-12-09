const axios = require('axios');

async function syncRealWorldData() {
  try {
    const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${process.env.WEATHER_API_KEY}`);
    const placesResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=51.5074,-0.1278&radius=1500&key=${process.env.GOOGLE_PLACES_API_KEY}`);
    return {
      weather: weatherResponse.data,
      places: placesResponse.data.results,
    };
  } catch (error) {
    console.error('Data sync error:', error);
    throw new Error('Failed to sync real-world data');
  }
}

module.exports = { syncRealWorldData };