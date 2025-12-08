```javascript
const axios = require('axios');
const logger = require('../utils/logger');

const experienceApi = axios.create({
  baseURL: 'https://api.experienceprovider.com/v1',
  timeout: 10000,
});

async function fetchExperiences(params) {
  try {
    const response = await experienceApi.get('/experiences', { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching experiences:', error);
    throw new Error('Could not fetch experiences');
  }
}

module.exports = {
  fetchExperiences
};
```