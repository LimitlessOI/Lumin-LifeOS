```jsx
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './PaymentPortal.css';

const PaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        const { error, paymentIntent } = await stripe.confirmCardPayment('{CLIENT_SECRET}', {
            payment_method: { card: cardElement },
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <CardElement />
            <button type="submit" disabled={!stripe}>Pay</button>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">Payment Successful!</div>}
        </form>
    );
};

export default PaymentForm;