const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const webhooks = require('./routes/webhooks');
const analytics = require('./routes/analytics');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/v1/funnel/webhook', webhooks);
app.use('/api/v1/funnel/analytics', analytics);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});