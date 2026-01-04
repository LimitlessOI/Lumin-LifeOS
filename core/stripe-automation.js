/**
 * STRIPE AUTOMATION - Complete Stripe Management via API
 * Creates products, prices, checkout sessions, handles webhooks
 * No manual Stripe dashboard work needed
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stripe = null;

// Initialize Stripe client
async function getStripeClient() {
  if (stripe) return stripe;
  
  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default || stripeModule.Stripe || stripeModule;
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️ [STRIPE] STRIPE_SECRET_KEY not set - Stripe features disabled');
      return null;
    }
    
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    
    console.log('✅ [STRIPE] Client initialized');
    return stripe;
  } catch (error) {
    console.warn('⚠️ [STRIPE] Failed to initialize:', error.message);
    return null;
  }
}

// Product definitions
const PRODUCTS = [
  {
    id: 'api_cost_savings',
    name: 'API Cost Savings Service',
    description: 'OpenAI-compatible API routing through free local models. Save 90% on AI API costs.',
    prices: [
      { id: 'starter', nickname: 'Starter', amount: 4900, interval: 'month', requests: '10K requests/month' },
      { id: 'pro', nickname: 'Pro', amount: 9900, interval: 'month', requests: '50K requests/month' },
      { id: 'enterprise', nickname: 'Enterprise', amount: 29900, interval: 'month', requests: 'Unlimited requests' }
    ]
  }
];

const PRODUCTS_FILE = path.join(process.cwd(), 'data', 'stripe-products.json');

/**
 * Ensure products and prices exist in Stripe
 * Creates them if they don't exist, returns existing if they do
 */
export async function ensureProductsExist() {
  const stripeClient = await getStripeClient();
  if (!stripeClient) {
    throw new Error('Stripe not initialized - STRIPE_SECRET_KEY required');
  }
  
  console.log('🔍 [STRIPE] Checking for existing products...');
  
  const result = {
    products: {},
    created: [],
    existing: []
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(PRODUCTS_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  
  // Load existing price IDs if file exists
  let existingPrices = {};
  try {
    const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    existingPrices = JSON.parse(fileContent);
    console.log('📖 [STRIPE] Loaded existing price IDs from file');
  } catch (e) {
    // File doesn't exist yet, that's OK
    existingPrices = {};
  }
  
  for (const productDef of PRODUCTS) {
    console.log(`\n📦 [STRIPE] Processing product: ${productDef.name}`);
    
    // Check if product already exists in Stripe
    const existingProducts = await stripeClient.products.list({
      limit: 100,
    });
    
    let stripeProduct = existingProducts.data.find(
      p => p.metadata?.product_id === productDef.id
    );
    
    if (!stripeProduct) {
      // Create product
      console.log(`  ➕ Creating product: ${productDef.name}`);
      stripeProduct = await stripeClient.products.create({
        name: productDef.name,
        description: productDef.description,
        metadata: {
          product_id: productDef.id,
          created_by: 'stripe-automation'
        }
      });
      result.created.push(`product: ${productDef.name}`);
    } else {
      console.log(`  ✅ Product exists: ${stripeProduct.name} (${stripeProduct.id})`);
      result.existing.push(`product: ${productDef.name}`);
    }
    
    result.products[productDef.id] = {
      product_id: stripeProduct.id,
      prices: {}
    };
    
    // Create or find prices
    for (const priceDef of productDef.prices) {
      const priceKey = `${productDef.id}_${priceDef.id}`;
      
      // Check if we already have this price ID saved
      if (existingPrices[priceKey]) {
        try {
          // Verify price still exists in Stripe
          const price = await stripeClient.prices.retrieve(existingPrices[priceKey]);
          if (price && price.active) {
            console.log(`  ✅ Price exists: ${priceDef.nickname} (${price.id})`);
            result.products[productDef.id].prices[priceDef.id] = price.id;
            result.existing.push(`price: ${priceDef.nickname}`);
            continue;
          }
        } catch (e) {
          // Price doesn't exist, create new one
          console.log(`  ⚠️ Saved price ID invalid, creating new: ${priceDef.nickname}`);
        }
      }
      
      // Check if price exists in Stripe (by metadata)
      const existingPricesList = await stripeClient.prices.list({
        product: stripeProduct.id,
        limit: 100,
      });
      
      let stripePrice = existingPricesList.data.find(
        p => p.metadata?.price_id === priceDef.id && p.active
      );
      
      if (!stripePrice) {
        // Create price
        console.log(`  ➕ Creating price: ${priceDef.nickname} ($${(priceDef.amount / 100).toFixed(2)}/${priceDef.interval})`);
        stripePrice = await stripeClient.prices.create({
          product: stripeProduct.id,
          unit_amount: priceDef.amount,
          currency: 'usd',
          recurring: {
            interval: priceDef.interval,
          },
          nickname: priceDef.nickname,
          metadata: {
            product_id: productDef.id,
            price_id: priceDef.id,
            requests: priceDef.requests || '',
            created_by: 'stripe-automation'
          }
        });
        result.created.push(`price: ${priceDef.nickname}`);
      } else {
        console.log(`  ✅ Price exists: ${priceDef.nickname} (${stripePrice.id})`);
        result.existing.push(`price: ${priceDef.nickname}`);
      }
      
      result.products[productDef.id].prices[priceDef.id] = stripePrice.id;
      
      // Save to file
      existingPrices[priceKey] = stripePrice.id;
    }
  }
  
  // Save all price IDs to file
  await fs.writeFile(
    PRODUCTS_FILE,
    JSON.stringify(existingPrices, null, 2),
    'utf-8'
  );
  
  console.log(`\n✅ [STRIPE] Products ensured. Created: ${result.created.length}, Existing: ${result.existing.length}`);
  console.log(`💾 [STRIPE] Price IDs saved to: ${PRODUCTS_FILE}`);
  
  return result;
}

/**
 * Create a checkout session
 * @param {string} plan - Plan ID (starter, pro, enterprise)
 * @param {string} projectId - Project/tenant ID (required for multi-tenant)
 * @param {string|null} customerId - Optional existing Stripe customer ID
 * @param {object} metadata - Additional metadata to include
 */
export async function createCheckoutSession(plan, projectId, customerId = null, metadata = {}) {
  const stripeClient = await getStripeClient();
  if (!stripeClient) {
    throw new Error('Stripe not initialized');
  }
  
  // Validate projectId is provided
  if (!projectId) {
    throw new Error('projectId is required for multi-tenant checkout sessions');
  }
  
  // Load price IDs
  let priceIds = {};
  try {
    const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    priceIds = JSON.parse(fileContent);
  } catch (e) {
    throw new Error('Price IDs not found. Run /api/stripe/setup first.');
  }
  
  // Find price ID for plan
  const priceKey = `api_cost_savings_${plan}`;
  const priceId = priceIds[priceKey];
  
  if (!priceId) {
    throw new Error(`Price ID not found for plan: ${plan}. Available: starter, pro, enterprise`);
  }
  
  const baseUrl = process.env.BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000';
  const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/`;
  
  console.log(`🛒 [STRIPE] Creating checkout session for plan: ${plan}, project: ${projectId}`);
  
  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId || undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      project_id: projectId, // CRITICAL: Required for multi-tenant webhook routing
      plan,
      ...metadata
    },
    subscription_data: {
      metadata: {
        project_id: projectId, // Also store in subscription metadata for future events
        plan
      }
    },
    allow_promotion_codes: true,
  });
  
  console.log(`✅ [STRIPE] Checkout session created: ${session.id} (project: ${projectId})`);
  
  return {
    session_id: session.id,
    url: session.url,
    plan,
    project_id: projectId
  };
}

/**
 * Extract project_id from Stripe event object
 * Tries multiple sources: metadata, subscription metadata, checkout session metadata
 */
async function extractProjectId(stripeClient, event) {
  const obj = event.data.object;
  
  // Try direct metadata first
  if (obj.metadata?.project_id) {
    return obj.metadata.project_id;
  }
  
  // For subscription events, check subscription metadata
  if (obj.subscription && typeof obj.subscription === 'string') {
    try {
      const subscription = await stripeClient.subscriptions.retrieve(obj.subscription);
      if (subscription.metadata?.project_id) {
        return subscription.metadata.project_id;
      }
    } catch (e) {
      // Subscription might not exist yet
    }
  }
  
  // For invoice events, get subscription and check its metadata
  if (obj.subscription && typeof obj.subscription === 'string') {
    try {
      const subscription = await stripeClient.subscriptions.retrieve(obj.subscription);
      if (subscription.metadata?.project_id) {
        return subscription.metadata.project_id;
      }
    } catch (e) {
      // Subscription might not exist
    }
  }
  
  // For checkout.session.completed, check session metadata
  if (event.type === 'checkout.session.completed' && obj.id) {
    try {
      const session = await stripeClient.checkout.sessions.retrieve(obj.id);
      if (session.metadata?.project_id) {
        return session.metadata.project_id;
      }
    } catch (e) {
      // Session might not be retrievable
    }
  }
  
  return null;
}

/**
 * Handle Stripe webhook events (multi-tenant)
 * Extracts project_id from event metadata and routes to appropriate handler
 */
export async function handleWebhook(payload, signature) {
  const stripeClient = await getStripeClient();
  if (!stripeClient) {
    throw new Error('Stripe not initialized');
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('⚠️ [STRIPE] STRIPE_WEBHOOK_SECRET not set - webhook verification disabled');
    // Continue without verification in dev, but warn
  }
  
  let event;
  
  try {
    if (webhookSecret) {
      event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // In dev, parse without verification (not recommended for production)
      event = JSON.parse(payload.toString());
      console.warn('⚠️ [STRIPE] Webhook verification skipped (no secret)');
    }
  } catch (err) {
    console.error(`❌ [STRIPE] Webhook signature verification failed: ${err.message}`);
    throw new Error(`Webhook Error: ${err.message}`);
  }
  
  // Extract project_id for multi-tenant routing
  const projectId = await extractProjectId(stripeClient, event);
  
  if (!projectId) {
    console.warn(`⚠️ [STRIPE] No project_id found in event: ${event.type}`);
    console.warn(`   Event ID: ${event.id}`);
    console.warn(`   This event cannot be routed to a specific project.`);
  }
  
  console.log(`📥 [STRIPE] Webhook received: ${event.type}${projectId ? ` (project: ${projectId})` : ' (no project_id)'}`);
  
  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log(`✅ [STRIPE] Checkout completed: ${session.id}`);
      console.log(`   Project: ${projectId || 'unknown'}`);
      console.log(`   Customer: ${session.customer || 'new customer'}`);
      console.log(`   Amount: $${(session.amount_total / 100).toFixed(2)}`);
      console.log(`   Plan: ${session.metadata?.plan || 'unknown'}`);
      
      // TODO: Store in database for project, send confirmation email, etc.
      // Example: await storeSubscriptionForProject(projectId, session);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log(`📋 [STRIPE] Subscription ${event.type}: ${subscription.id}`);
      console.log(`   Project: ${projectId || 'unknown'}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Customer: ${subscription.customer}`);
      
      // TODO: Update database with subscription status for project
      // Example: await updateProjectSubscription(projectId, subscription);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      console.log(`🗑️ [STRIPE] Subscription cancelled: ${deletedSub.id}`);
      console.log(`   Project: ${projectId || 'unknown'}`);
      
      // TODO: Update database, revoke access for project, etc.
      // Example: await cancelProjectSubscription(projectId, deletedSub);
      break;
      
    case 'invoice.paid':
      const invoice = event.data.object;
      console.log(`💰 [STRIPE] Invoice paid: ${invoice.id}`);
      console.log(`   Project: ${projectId || 'unknown'}`);
      console.log(`   Amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
      
      // TODO: Record payment for project, update subscription, etc.
      // Example: await recordPaymentForProject(projectId, invoice);
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log(`❌ [STRIPE] Payment failed: ${failedInvoice.id}`);
      console.log(`   Project: ${projectId || 'unknown'}`);
      
      // TODO: Notify customer for project, update subscription status
      // Example: await handlePaymentFailureForProject(projectId, failedInvoice);
      break;
      
    default:
      console.log(`ℹ️ [STRIPE] Unhandled event type: ${event.type}${projectId ? ` (project: ${projectId})` : ''}`);
  }
  
  return { 
    received: true, 
    type: event.type,
    project_id: projectId || null
  };
}

/**
 * Get saved products/prices
 */
export async function getProducts() {
  try {
    const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (e) {
    return {};
  }
}
