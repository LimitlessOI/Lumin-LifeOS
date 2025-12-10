```sql
-- Create the feedback table
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX idx_feedback_userId ON feedback(userId);
CREATE INDEX idx_feedback_rating ON feedback(rating);
```