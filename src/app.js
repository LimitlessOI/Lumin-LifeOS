```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const clientRoutes = require('./modules/clients/client.routes');
const stripeWebhook = require('./modules/clients/stripe.webhook');

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

// Add client routes
app.use('/api/clients', clientRoutes);

// Stripe webhook endpoint
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), stripeWebhook.handleStripeWebhook);

module.exports = app;
```