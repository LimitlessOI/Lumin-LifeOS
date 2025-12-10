```jsx
import React, { useState } from 'react';

const PaymentForm = () => {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      const data = await response.json();
      setStatus(`Payment Intent Created: ${data.id}`);
    } catch (error) {
      setStatus('Error creating payment intent');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
        required
      />
      <button type="submit">Pay</button>
      <div>{status}</div>
    </form>
  );
};

export default PaymentForm;
```