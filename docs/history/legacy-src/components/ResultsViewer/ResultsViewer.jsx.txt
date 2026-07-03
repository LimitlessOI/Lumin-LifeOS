```javascript
import React from 'react';
import { useCodeReview } from '../../hooks/useCodeReview';
import ResultsDisplay from './ResultsDisplay';
import ErrorDisplay from './ErrorDisplay';

const ResultsViewer = ({ reviewId }) => {
    const { data, error, loading } = useCodeReview(reviewId);

    if (loading) return <div>Loading...</div>;
    if (error) return <ErrorDisplay message={error} />;
    return <ResultsDisplay data={data} />;
};

export default ResultsViewer;