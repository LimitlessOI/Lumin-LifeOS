```typescript
import { PrismaClient } from '@prisma/client';
import { User } from './user.model';

const prisma = new PrismaClient();

export async function createUser(email: string, passwordHash: string): Promise<User> {
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}
```