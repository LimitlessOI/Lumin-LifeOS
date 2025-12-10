```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io();

function CodeReviewHistory() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const response = await axios.get('/api/codeReviews');
      setReviews(response.data);
    };

    fetchReviews();

    socket.on('statusUpdate', (update) => {
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === update.codeReviewId ? { ...review, status: update.status } : review
        )
      );
    });

    return () => {
      socket.off('statusUpdate');
    };
  }, []);

  return (
    <div>
      <h1>Code Review History</h1>
      <ul>
        {reviews.map((review) => (
          <li key={review.id}>
            {review.code} - {review.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CodeReviewHistory;
```