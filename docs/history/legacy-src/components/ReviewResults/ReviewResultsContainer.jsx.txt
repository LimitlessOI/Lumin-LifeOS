import React, { useEffect, useState } from 'react';
import { fetchReviews } from '../../services/reviewService';
import ReviewSummary from './ReviewSummary';
import ReviewFindings from './ReviewFindings';
import ReviewMetrics from './ReviewMetrics';

const ReviewResultsContainer = () => {
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const loadReviews = async () => {
            try {
                const data = await fetchReviews();
                setReviews(data);
            } catch (error) {
                console.error('Error loading reviews:', error);
            }
        };
        loadReviews();
    }, []);

    return (
        <div>
            <ReviewSummary reviews={reviews} />
            <ReviewFindings reviews={reviews} />
            <ReviewMetrics reviews={reviews} />
        </div>
    );
};

export default ReviewResultsContainer;