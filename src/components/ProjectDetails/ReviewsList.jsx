```javascript
import React from 'react';
import ReviewCard from './ReviewCard';

const ReviewsList = ({ reviews }) => (
  <div className="reviews-list">
    {reviews.length > 0 ? (
      reviews.map((review) => <ReviewCard key={review.id} review={review} />)
    ) : (
      <p>No reviews available.</p>
    )}
  </div>
);

export default ReviewsList;