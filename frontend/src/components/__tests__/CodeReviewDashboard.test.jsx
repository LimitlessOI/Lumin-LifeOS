```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import CodeReviewDashboard from '../CodeReviewDashboard';

test('renders code review dashboard', () => {
  render(<CodeReviewDashboard />);
  expect(screen.getByText(/Code Review Dashboard/i)).toBeInTheDocument();
});
```