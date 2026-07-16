/**
 * SYNOPSIS: Service module — StripePaymentLinksService.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
[
  {
    "old_string":"async function createPaymentLinks() {\n  try {\n    // Define your pricing tiers\n    const pricingTiers = [\n      { priceId: 'price_123', label: 'Basic Tier' },\n      { priceId: 'price_456', label: 'Standard Tier' },\n      { priceId: 'price_789', label: 'Premium Tier' },\n    ];\n\n    // Generate payment links for each tier\n    const paymentLinks = await Promise.all(pricingTiers.map(async (tier) => {\n      const paymentLink = await stripe.paymentLinks.create({\n        line_items: [{ price: tier.priceId, quantity: 1 }],\n      });\n      return { ...tier, url: paymentLink.url };\n    }));\n\n    return paymentLinks;\n  } catch (error) {\n    console.error('Error creating payment links:', error);\n    throw error;\n  }\n}",
    "new_string":"async function createPaymentLinks() {\n  try {\n    // Define your pricing tiers\n    const pricingTiers = [\n      { priceId: 'price_123', label: 'Basic Tier' },\n      { priceId: 'price_456', label: 'Standard Tier' },\n      { priceId: 'price_789', label: 'Premium Tier' },\n    ];\n\n    // Generate payment links for each tier\n    const paymentLinks = await Promise.all(pricingTiers.map(async (tier) => {\n      const paymentLink = await stripe.paymentLinks.create({\n        line_items: [{ price: tier.priceId, quantity: 1 }],\n      });\n      return { ...tier, url: paymentLink.url };\n    }));\n\n    return paymentLinks;\n  } catch (error) {\n    console.error('Error creating payment links:', error);\n    throw error;\n  }\n}"
  }
]
