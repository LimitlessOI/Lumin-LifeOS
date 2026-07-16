/**
 * SYNOPSIS: Registers IdentifyCustomersRoutes routes/handlers (routes/identifyCustomersRoute.js).
 */
import express from 'express';

const router = express.Router();

const customers = [
  { id: 1, name: 'Customer A', target: true },
  { id: 2, name: 'Customer B', target: true },
  { id: 3, name: 'Customer C', target: true },
  { id: 4, name: 'Customer D', target: true },
  { id: 5, name: 'Customer E', target: true },
  { id: 6, name: 'Customer F', target: false },
  // ... more customers
];

function identifyTargetCustomers() {
  return customers.filter(customer => customer.target).slice(0, 5);
}

router.get('/identify-target-customers', (req, res) => {
  const targetCustomers = identifyTargetCustomers();
  res.json(targetCustomers);
});

export function registerIdentifyCustomersRoutes(app) {
  app.use('/api', router);
}

export { identifyTargetCustomers };
