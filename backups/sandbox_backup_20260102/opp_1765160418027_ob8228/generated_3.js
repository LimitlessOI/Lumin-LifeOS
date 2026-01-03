// routes/api_routes.js (Express router with API endpoints)
const express = require('express');
const apiRouter = express.Router();

/** POST method for creating user account using Stripe checkout */
apiRouter.post('/user', async function(req, res) {
  try {
    const token = await stripe.createToken({ email: req.body.email }); // Using the client-side library to obtain a secure and hidden Stripe payment method identifier (token). In production, this should be sent with HTTPS POST request body without exposing sensitive details like secret API keys on frontend
    const customer = await stripe.customers.create({ email: req.body.email }); // Creating the user in our system and linking it to Stripe for future payments (should ideally link this directly with actual payment methods after proper security measures are implemented) 
    
    res.status(201).json({ message: 'Account created', customerId: customer.id, stripeToken: token }); // Returning the newly created user and their Stripe Token for future transactions related to this account creation (this is a simplified example assuming one-time payment or subscription)
  } catch(error) {
    console.log('Error during User Registration');
    throw error;
  end file===