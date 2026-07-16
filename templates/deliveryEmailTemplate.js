/**
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
// SYNOPSIS: Delivery email template.
export function getDeliveryEmailTemplate(customerName, orderNumber, deliveryDate) {
  return `
    Dear ${customerName},
    We are pleased to inform you that your order #${orderNumber} is scheduled for delivery on ${deliveryDate}.
    Thank you for shopping with us!
    Best regards,
    The Delivery Team
  `;
}

export { getDeliveryEmailTemplate as deliveryEmailTemplate };
