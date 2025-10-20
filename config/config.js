require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY
};