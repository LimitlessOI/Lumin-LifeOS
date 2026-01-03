// Requiring Stripe's Node library and initializing for use in your application; not directly executable code but represents setup steps needed before using the actual API endpoints below: 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // or any other method of securely storing keys, typically fetched from environment variables in production scenarios; also assuming proper error handling and secret key management not covered here for simplicity's sake:

router.post('/api/charge', async (req, res) => { 
    try {  
        const paymentIntent = await stripe.charges.create({
            amount: req.body.amount * 100, // Amount in cents to match Stripe's format; convert your currency handling logic accordingly and ensure proper error catching is implemented for production use.
            currency: 'usd',
            source: req.body.sourceId, // The customer’s card details from PayPal or other payment service provider (PSV) integration would be passed here along with a reference ID; this data should come securely through OAuth and not hardcoded as shown for simplicity purposes only in the example code provided above
            description: 'AI-Optimized Task Assignment',  // Description field is optional but good practice to add context.
        });  
        
        res.status(200).json({ message: "Payment Successful!", paymentIntentId: paymentIntent.id });  
    } catch (error) {
      console.error('Error during charge processing on the frontend UI or backend service: ', error);
      res.status(400).send('Charge Error');  end;
}