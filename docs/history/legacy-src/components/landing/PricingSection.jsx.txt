```jsx
import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import landingApi from '../../api/landingApi';

const stripePromise = loadStripe('your-publishable-key-here');

const PricingSection = () => {
  const [pricingPlans, setPricingPlans] = useState([]);

  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        const response = await landingApi.getPricing();
        setPricingPlans(response.data);
      } catch (error) {
        console.error('Error fetching pricing plans:', error);
      }
    };

    fetchPricingPlans();
  }, []);

  return (
    <section className="pricing-section">
      <h2>Our Pricing</h2>
      <Elements stripe={stripePromise}>
        {pricingPlans.map(plan => (
          <div key={plan.id}>
            <h3>{plan.name}</h3>
            <p>{plan.amount / 100} {plan.currency.toUpperCase()}</p>
          </div>
        ))}
      </Elements>
    </section>
  );
};

export default PricingSection;
```