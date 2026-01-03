const express = require('express');
const router = express.Router();
const { processPayment, getAllPayments } = require('../controllers/paymentController'); // Assume these functions are implemented in payment controller 

router.post('/', processPayment); // Process a new payment; Include logic for creating or updating payments and handling status updates (omitted here)
router.get('/all', getAllPayments); // Retrieve all payments with their associated user details, currency information etc.