```typescript
import { registerUser, loginUser } from '../../src/modules/users/user.service';
import { jest } from '@jest/globals';

jest.mock('../../src/modules/users/user.repository');
jest.mock('../../src/modules/auth/password.utils');

describe('User Service', () => {
  it('should register a new user', async () => {
    const user = await registerUser('test@example.com', 'password123');
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email', 'test@example.com');
  });

  it('should login a user', async () => {
    const { token, user } = await loginUser('test@example.com', 'password123');
    expect(token).toBeDefined();
    expect(user).toHaveProperty('email', 'test@example.com');
  });
});
```