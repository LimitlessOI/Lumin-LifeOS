```javascript
import React from 'react';
import { render } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import LoginForm from '../components/LoginForm';

expect.extend(toHaveNoViolations);

test('LoginForm should have no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```