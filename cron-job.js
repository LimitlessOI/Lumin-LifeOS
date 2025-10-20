// cron-job.js
const cron = require('node-cron');
const fetch = require('node-fetch');

const APP = 'http://example.com'; // Replace with your actual API endpoint
const KEY = 'your_api_key'; // Replace with your actual API key

// Schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running task cleanup cron job...');
  fetch(`${APP}/internal/autopilot/reset-stuck?key=${KEY}&minutes=15}`)
    .then(response => response.json())
    .then(data => console.log('Cron job reset tasks response:', data))
    .catch(error => console.error('Error in cron job resetting tasks:', error));
});
