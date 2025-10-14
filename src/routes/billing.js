// src/routes/billing.js - Stripe Billing Integration
import express from 'express';
import Stripe from 'stripe';

export function billingRouter(pool) {
  const router = express.Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Create checkout session
  router.post('/create-checkout-session', async (req, res) => {
    try {
      const { email, baseline_commission } = req.body;
      
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
      }

      // Check if customer already exists
      const existing = await pool.query(
        'SELECT * FROM customers WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Email already registered. Please contact support.' 
        });
      }

      // Create Stripe checkout session (free consultation, no immediate charge)
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer_email: email,
        success_url: `${process.env.PUBLIC_BASE_URL}/welcome?email=${encodeURIComponent(email)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PUBLIC_BASE_URL}/sales-coaching?canceled=1`,
        payment_method_types: ['card'],
        metadata: {
          baseline_commission: baseline_commission || '0',
          plan: 'sales_transformation'
        }
      });

      res.json({ 
        ok: true, 
        id: session.id, 
        url: session.url 
      });

    } catch (e) {
      console.error('[billing]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Webhook handler
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.sendStatus(400);
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;
        const customerId = session.customer;
        const baseline = session.metadata?.baseline_commission || '0';

        // Create customer record
        await pool.query(`
          INSERT INTO customers (stripe_customer_id, email, plan, status, baseline_commission)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (stripe_customer_id) DO UPDATE 
          SET status = EXCLUDED.status
        `, [customerId, email, 'sales_transformation', 'active', baseline]);

        console.log(`[webhook] Customer created: ${email}`);
      }

      if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        
        await pool.query(`
          UPDATE customers 
          SET stripe_subscription_id = $1, status = $2
          WHERE stripe_customer_id = $3
        `, [sub.id, sub.status, sub.customer]);

        console.log(`[webhook] Subscription ${sub.status}: ${sub.customer}`);
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        
        await pool.query(`
          UPDATE customers 
          SET status = 'canceled'
          WHERE stripe_customer_id = $1
        `, [sub.customer]);

        console.log(`[webhook] Subscription canceled: ${sub.customer}`);
      }

      res.sendStatus(200);

    } catch (e) {
      console.error('[webhook] Processing error:', e);
      res.sendStatus(500);
    }
  });

  // Get customer status
  router.get('/status', async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
      }

      const customer = await pool.query(
        'SELECT * FROM customers WHERE email = $1',
        [email]
      );

      if (customer.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Customer not found' });
      }

      res.json({ ok: true, customer: customer.rows[0] });

    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
