```sql
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  userId INT NOT NULL,
  contentId INT NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_aggregates (
  contentId INT PRIMARY KEY,
  averageRating DECIMAL(3, 2),
  feedbackCount INT
);
```