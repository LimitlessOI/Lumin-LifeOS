/**
 * SYNOPSIS: routes/transcriptCronVerificationRoutes.js
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
// routes/transcriptCronVerificationRoutes.js

// Function to register the routes
function registerTranscriptCronVerificationRoutes(app) {
  // Define a route to check the status of the transcript purge cron
  app.get('/transcript-cron-status', (req, res) => {
    // Example response, replace with actual logic to check cron status
    const cronStatus = {
      status: 'running', // or 'stopped', based on actual implementation
      lastRun: '2023-10-10T10:00:00Z', // example timestamp
    };
    
    res.json(cronStatus);
  });
}

// Export the function using ES Module syntax
export { registerTranscriptCronVerificationRoutes };
