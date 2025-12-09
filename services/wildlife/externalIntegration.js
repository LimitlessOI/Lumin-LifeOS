const axios = require('axios');

const NASA_API_URL = 'https://api.nasa.gov/some-endpoint';
const ESA_API_URL = 'https://api.esa.int/some-endpoint';
const GBIF_API_URL = 'https://api.gbif.org/v1/';
const EBIRD_API_URL = 'https://api.ebird.org/v2/';

async function fetchSatelliteData() {
    try {
        const nasaResponse = await axios.get(NASA_API_URL);
        const esaResponse = await axios.get(ESA_API_URL);
        console.log('Satellite data fetched successfully');
        return { nasa: nasaResponse.data, esa: esaResponse.data };
    } catch (error) {
        console.error('Error fetching satellite data:', error);
    }
}

async function fetchConservationData() {
    try {
        const gbifResponse = await axios.get(`${GBIF_API_URL}occurrence/search`);
        const ebirdResponse = await axios.get(`${EBIRD_API_URL}data/obs/geo/recent`);
        console.log('Conservation data fetched successfully');
        return { gbif: gbifResponse.data, ebird: ebirdResponse.data };
    } catch (error) {
        console.error('Error fetching conservation data:', error);
    }
}

module.exports = { fetchSatelliteData, fetchConservationData };