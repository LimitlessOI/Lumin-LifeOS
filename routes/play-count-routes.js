/**
 * SYNOPSIS: routes/play-count-routes.js
 * @ssot docs/products/game-publisher/PRODUCT_HOME.md
 */
// routes/play-count-routes.js

let playCounts = {}; // Assuming a simple in-memory storage for play counts

// Function to handle play count increment
function incrementPlayCount(gameId) {
  if (!playCounts[gameId]) {
    playCounts[gameId] = 0;
  }
  playCounts[gameId]++;
}

// Endpoint function
function handlePlayCountRequest(req, res) {
  const { gameId } = req.body;
  if (gameId) {
    incrementPlayCount(gameId);
    res.status(200).send({ success: true, playCount: playCounts[gameId] });
  } else {
    res.status(400).send({ success: false, message: 'Game ID is required' });
  }
}

// Register the route
function registerPlayCountRoutes(app) {
  app.post('/track-play', handlePlayCountRequest);
}

// Export the registration function
export { registerPlayCountRoutes };
