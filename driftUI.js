const express = require('express');
const app = express();
const port = 3000;

app.get('/admin/drift', (req, res) => {
  // Placeholder for logic to fetch blocks and deltas
  res.send('<h1>Drift Visualization UI</h1>');
});

app.listen(port, () => {
  console.log(`Drift UI running at http://localhost:${port}`);
});