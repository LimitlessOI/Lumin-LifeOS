const express = require('express');
const { runMigrations } = require('./src/services/migrationService');
const clientController = require('./src/controllers/clientController');

const app = express();
app.use(express.json());

app.post('/migrate', (req, res) => {
  runMigrations();
  res.send('Migrations run');
});

app.post('/clients', clientController.createClient);
app.get('/clients', clientController.getClients);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});