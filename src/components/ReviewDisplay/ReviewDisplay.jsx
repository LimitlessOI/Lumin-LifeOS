```javascript
import React from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import ReviewDisplayView from './ReviewDisplayView';

function ReviewDisplay({ reviewId }) {
    const { data: review, error, isLoading } = useQuery(['review', reviewId], async () => {
        const { data } = await axios.get(`/api/v1/reviews/${reviewId}`);
        return data;
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading review.</div>;

    return <ReviewDisplayView review={review} />;
}

export default ReviewDisplay;