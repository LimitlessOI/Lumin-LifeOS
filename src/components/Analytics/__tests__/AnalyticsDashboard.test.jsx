```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsDashboard from '../AnalyticsDashboard';

test('renders Analytics Dashboard heading', () => {
  render(<AnalyticsDashboard />);
  const headingElement = screen.getByText(/Analytics Dashboard/i);
  expect(headingElement).toBeInTheDocument();
});