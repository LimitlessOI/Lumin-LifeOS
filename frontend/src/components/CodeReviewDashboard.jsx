```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CodeReviewDashboard = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    axios.get('/api/reviews')
      .then(response => setReviews(response.data))
      .catch(error => console.error('Error fetching reviews:', error));
  }, []);

  return (
    <div>
      <h1>Code Review Dashboard</h1>
      <ul>
        {reviews.map(review => (
          <li key={review.id}>
            {review.repository} - {review.branch}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CodeReviewDashboard;
```