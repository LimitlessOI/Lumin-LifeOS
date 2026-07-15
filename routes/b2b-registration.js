/**
 * SYNOPSIS: Registers B2BCustomerRoutes routes/handlers (routes/b2b-registration.js).
 */
import express from 'express';

const router = express.Router();

function registerB2BCustomer(req, res) {
  const { name, email, company } = req.body;

  // Simulate database operation
  const requestId = Math.floor(Math.random() * 10000);
  const tcoRequest = {
    id: requestId,
    name,
    email,
    company,
    status: 'pending',
  };

  // Simulate storing in tco_requests
  console.log('Stored in tco_requests:', tcoRequest);

  res.status(201).json({ message: 'B2B Customer registered', requestId });
}

router.post('/register', registerB2BCustomer);

export function registerB2BCustomerRoutes(app) {
  app.use('/b2b', router);
}
