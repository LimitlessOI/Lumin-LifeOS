```javascript
import React from 'react';

const ReviewCard = ({ review }) => (
  <div className="review-card">
    <h3>{review.user_id}</h3>
    <p>{review.content}</p>
    <span>Rating: {review.rating}</span>
  </div>
);

export default ReviewCard;