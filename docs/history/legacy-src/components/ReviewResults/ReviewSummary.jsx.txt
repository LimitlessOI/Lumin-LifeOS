import React from 'react';

const ReviewSummary = ({ reviews }) => {
    return (
        <div>
            <h2>Review Summary</h2>
            <ul>
                {reviews.map(review => (
                    <li key={review.id}>{review.code_base} - {review.review_date}</li>
                ))}
            </ul>
        </div>
    );
};

export default ReviewSummary;