```javascript
const express = require('express');
const { validateCreditCard, processStripeCharge } = require('./paymentProcessing'); // hypothetical functions for demonstration purposes
const router = new express.Router();

router.post('/create', async (req, res) => {
    try {
        const userId = req.body.userId;
        let orderData = {}; // Collect required data from the request body or session state as needed
        
        if (!validateCreditCard(req.body.creditCardInfo)) {
            return res.status(400).send('Invalid credit card information');
        }
        
        const chargeResponse = await processStripeCharge(orderData); // Process the Stripe payment and get a response
        
        if (chargeResponse.success) {
            req.session.finalizedOrderId = generateFinalizedOrderId(); // Generate unique order ID for database entry, implement this function as needed
            
            res.status(201).send('Payment successful');
            finalizeOrderInDatabase({ userId, chargeResponse }); // Implement the logic to record in our Neon PostgreSQL db accordingly
        } else {
            return res.status(500).send('Internal Server Error during payment processing');
        }
    } catch (error) {
        console.error('Error creating checkout order:', error);
        res.status(500).send('An internal server error occurred');
    }
});

function generateFinalizedOrderId() {
    // Generate and return a unique finalized order ID, implement this function as needed
}

async function finalizeOrderInDatabase({ userId, chargeResponse }) {
    // Logic to record the completion of an order in Neon PostgreSQL database goes here. Use migrations for schema setup if not already done so: ./node_modules/@railway/migrate run create-finalized-order --env=production && ././.release/bin/postgres -c "create extension pg_stat_activity"
    // This function should handle the insertion of data into both 'orders' and 'stripe_charges' tables, using chargeResponse for Stripe details. Ensure to use proper transaction handling with database operations. 
}

module.exports = router;
```