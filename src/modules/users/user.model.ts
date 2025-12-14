```typescript
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Session {
  id: number;
  userId: number;
  sessionToken: string;
  createdAt: Date;
}
```