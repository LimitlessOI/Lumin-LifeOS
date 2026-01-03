```javascript
require('dotenv').config(); // Load environment variables from .env file for production security reasons
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Initialize Stripe object with secret key set in the .env file, not hardcoded into any of your code files to avoid exposure risk
```