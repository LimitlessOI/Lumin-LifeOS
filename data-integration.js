```javascript
const axios = require('axios');

async function fetchDataFromNOAA() {
    try {
        const response = await axios.get('https://api.noaa.gov/data');
        return response.data;
    } catch (error) {
        console.error('Error fetching data from NOAA:', error);
        throw error;
    }
}

async function fetchDataFromNASA() {
    try {
        const response = await axios.get('https://api.nasa.gov/data');
        return response.data;
    } catch (error) {
        console.error('Error fetching data from NASA:', error);
        throw error;
    }
}

module.exports = { fetchDataFromNOAA, fetchDataFromNASA };
```