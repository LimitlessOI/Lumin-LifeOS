// models/Order.js
const Sequelize = require('sequelize');
module.exports = function (sequelize) {
  return sequelize.define('order', {
    userId: Sequelize.STRING, // Assuming the User model has a UUID primary key type for simplicity here too
    totalAmount: Sequelize.FLOAT,
    status: Sequelize.ENUM(['pending', 'paid', 'cancelled']),
    paymentMethodStripeId: Sequelize.STRING // Storing the unique ID provided by Stripe for reference in future operations
  }, {});
};