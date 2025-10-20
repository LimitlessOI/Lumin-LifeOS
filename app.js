const express = require('express');
const bodyParser = require('body-parser');
const outreachRoutes = require('./routes/outreach');
const { connectToDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/v1/outreach', outreachRoutes);

// Connect to Database
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database connection failed:', err);
});
