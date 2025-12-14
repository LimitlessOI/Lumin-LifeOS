import React from 'react';
import ReviewResultsContainer from './ReviewResultsContainer';
import './ReviewResults.css';
import { ThemeProvider } from 'styled-components';
import ErrorBoundary from '../../components/ErrorBoundary';

const theme = {
    colors: {
        primary: '#0070f3',
        background: '#f9f9f9'
    }
};

const ReviewResults = () => {
    return (
        <ThemeProvider theme={theme}>
            <ErrorBoundary>
                <div className="review-results">
                    <ReviewResultsContainer />
                </div>
            </ErrorBoundary>
        </ThemeProvider>
    );
};

export default ReviewResults;