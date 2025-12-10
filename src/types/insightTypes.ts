```typescript
export interface Insight {
  id: number;
  reviewId: number;
  insightText: string;
  confidenceScore: number;
  type: string;
  createdAt: string;
}

export interface Feedback {
  id: number;
  insightId: number;
  userId: number;
  feedback: string;
  rating: number;
  createdAt: string;
}
```