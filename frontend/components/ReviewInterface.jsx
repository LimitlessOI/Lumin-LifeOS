import React, { useState } from 'react';

const ReviewInterface = ({ submissionId, onReviewSubmit }) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(1);

  const handleSubmit = (event) => {
    event.preventDefault();
    onReviewSubmit({ submissionId, feedback, rating });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Enter your feedback here"
        required
      />
      <input
        type="number"
        value={rating}
        onChange={(e) => setRating(e.target.value)}
        min="1"
        max="5"
        required
      />
      <button type="submit">Submit Review</button>
    </form>
  );
};

export default ReviewInterface;