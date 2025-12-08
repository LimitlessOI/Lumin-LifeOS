```javascript
const axios = require('axios');
const logger = require('../utils/logger');

const flightApi = axios.create({
  baseURL: 'https://api.flightprovider.com/v1',
  timeout: 10000,
});

async function fetchFlights(params) {
  try {
    const response = await flightApi.get('/flights', { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching flights:', error);
    throw new Error('Could not fetch flights');
  }
}

module.exports = {
  fetchFlights
};
```