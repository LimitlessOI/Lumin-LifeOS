```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeReviewProvider } from '../../contexts/CodeReviewContext';
import Dashboard from '../Dashboard';

test('renders dashboard with submission title', () => {
    render(
        <CodeReviewProvider>
            <Dashboard />
        </CodeReviewProvider>
    );
    const titleElement = screen.getByText(/Code Submissions/i);
    expect(titleElement).toBeInTheDocument();
});
```