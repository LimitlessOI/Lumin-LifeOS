/**
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 * SYNOPSIS: HTTP route module — DeliveryEmailRoute.
 */
import express from 'express';

const router = express.Router();

function renderDeliveryEmailTemplate(req, res) {
  const { userName, orderId, deliveryDate } = req.query;
  const emailContent = `
    <h1>Delivery Confirmation</h1>
    <p>Dear ${userName},</p>
    <p>Your order with ID ${orderId} has been delivered successfully.</p>
    <p>Delivery Date: ${deliveryDate}</p>
    <p>Thank you for shopping with us!</p>
  `;
  res.send(emailContent);
}

function registerDeliveryEmailRoutes(app) {
  router.get('/delivery-email', renderDeliveryEmailTemplate);
  app.use('/api', router);
}

export { registerDeliveryEmailRoutes };
