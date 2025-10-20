// worker-loop.js
const APP = 'http://example.com'; // Replace with your actual API endpoint
const KEY = 'your_api_key'; // Replace with your actual API key

const resetStuckTasks = () => {
  fetch(`${APP}/internal/autopilot/reset-stuck?key=${KEY}&minutes=15}`)
    .then(response => response.json())
    .then(data => console.log('Reset tasks response:', data))
    .catch(error => console.error('Error resetting tasks:', error));
};

// Run the reset function every 5 minutes
setInterval(resetStuckTasks, 300000);

// ... Other worker loop code