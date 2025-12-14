```typescript
import { createUser, findUserByEmail } from './user.repository';
import { hashPassword, verifyPassword } from '../auth/password.utils';
import jwt from 'jsonwebtoken';

export async function registerUser(email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return createUser(email, passwordHash);
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (user && await verifyPassword(password, user.passwordHash)) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    return { token, user };
  }
  throw new Error('Invalid credentials');
}
```