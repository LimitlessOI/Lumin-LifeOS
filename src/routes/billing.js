import express from 'express';
import Stripe from 'stripe';

export function billingRouter(pool) {
  const router = express.Router();
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  
  // Start baseline (no payment yet)
  router.post('/start-baseline', async (req, res) => {
    try {
      const { email, baseline_commission } = req.body;
      
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email required' });
      }
      
      // Check if already exists
      const existing = await pool.query(
        'SELECT * FROM customers WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        return res.json({ 
          ok: true, 
          existing: true,
          customer: existing.rows[0] 
        });
      }
      
      // Create customer record (no Stripe yet)
      await pool.query(`
        INSERT INTO customers (email, baseline_commission, plan, status)
        VALUES ($1, $2, 'sales_coaching', 'baseline')
      `, [email, baseline_commission || 0]);
      
      console.log(`[baseline] Started for ${email}`);
      
      res.json({ 
        ok: true, 
        success: true,
        message: 'Baseline started. We\'ll track your sales for 90 days at zero cost.' 
      });
      
    } catch (e) {
      console.error('[billing/start-baseline]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  
  // Create Stripe checkout (for when they want to upgrade)
  router.post('/create-checkout-session', async (req, res) => {
    try {
      const price = process.env.STRIPE_PRICE_ID_MONTHLY;
      if (!price) {
        return res.status(400).json({ ok: false, error: 'Stripe not configured' });
      }
      
      const { email } = req.body || {};
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        customer_email: email,
        success_url: `${process.env.PUBLIC_BASE_URL}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PUBLIC_BASE_URL}/sales-coaching?canceled=1`,
        allow_promotion_codes: true,
        subscription_data: { trial_period_days: 7 }
      });
      
      res.json({ ok: true, id: session.id, url: session.url });
      
    } catch (e) {
      console.error('[billing/checkout]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  
  // Stripe webhook
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.sendStatus(400);
    }
    
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details?.email || null;
        const customerId = session.customer || null;
        const subscriptionId = session.subscription || null;
        
        await pool.query(`
          INSERT INTO customers (stripe_customer_id, stripe_subscription_id, email, plan, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (stripe_customer_id) 
          DO UPDATE SET 
            stripe_subscription_id = EXCLUDED.stripe_subscription_id, 
            status = EXCLUDED.status
        `, [customerId, subscriptionId, email, 'sales_coaching', 'active']);
        
        console.log(`[webhook] New customer: ${email}`);
      }
      
      if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        await pool.query(
          'UPDATE customers SET status = $1 WHERE stripe_subscription_id = $2',
          [sub.status, sub.id]
        );
      }
      
      res.sendStatus(200);
    } catch (e) {
      console.error('[webhook]', e);
      res.sendStatus(500);
    }
  });
  
  return router;
}
