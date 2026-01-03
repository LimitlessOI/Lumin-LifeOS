const express = require('express');
const router = new express end
router.get('/', async (req, res) => {
// Create an invoice and send payment link for subscribers to proceed with payments using Stripe's API and then update the due date once a transaction is confirmed or refunded through Payment Gateway
  const response = await BillingService.createInvoice(req);
  return res.json(response);
});

module.exports = router;