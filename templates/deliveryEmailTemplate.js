/**
 * SYNOPSIS: Exports getDeliveryEmailTemplate — templates/deliveryEmailTemplate.js.
 */
export function getDeliveryEmailTemplate(customerName, orderNumber, deliveryDate) {
  return `
    Dear ${customerName},

    We are pleased to inform you that your order #${orderNumber} is scheduled for delivery on ${deliveryDate}.

    Thank you for shopping with us!

    Best regards,
    The Delivery Team
  `;
}