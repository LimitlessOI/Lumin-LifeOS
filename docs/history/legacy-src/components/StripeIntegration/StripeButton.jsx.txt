```javascript
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('your-publishable-key-here');

const StripeButton = () => {
  const handleCheckout = async () => {
    const { error } = await stripePromise.redirectToCheckout({
      lineItems: [{ price: 'price_1Hh1ZZClCIKljWfJsbKZkGq0', quantity: 1 }],
      mode: 'payment',
      successUrl: window.location.origin + '/success',
      cancelUrl: window.location.origin + '/canceled',
    });

    if (error) {
      console.error('Stripe checkout error', error);
    }
  };

  return <button onClick={handleCheckout}>Buy Premium</button>;
};

export default StripeButton;