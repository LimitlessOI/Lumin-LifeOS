```jsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import PaymentForm from '../PaymentForm';

test('renders correctly and submits payment', async () => {
  fetch.mockResponseOnce(JSON.stringify({ id: 'pi_123' }));

  render(<PaymentForm />);
  const input = screen.getByPlaceholderText('Enter amount');
  fireEvent.change(input, { target: { value: '10' } });

  fireEvent.click(screen.getByText('Pay'));

  expect(await screen.findByText('Payment Intent Created: pi_123')).toBeInTheDocument();
});
```