```javascript
import React from 'react';
import styled from 'styled-components';
import CommentItem from './CommentItem';

const ReviewContainer = styled.div`
    padding: 20px;
    max-width: 800px;
    margin: auto;
`;

function ReviewDisplayView({ review }) {
    return (
        <ReviewContainer>
            <h1>{review.title}</h1>
            {/* Render comments and other review details here */}
            {review.comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
            ))}
        </ReviewContainer>
    );
}

export default ReviewDisplayView;