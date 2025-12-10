```jsx
import React, { useEffect } from 'react';
import axios from 'axios';

const AnalyticsTracker = () => {
    useEffect(() => {
        // Send analytics data to the backend
        axios.post('/api/analytics', { event: 'page_view' });
    }, []);

    return (
        <div className="analytics-tracker">
            <h2>Analytics Tracker Component</h2>
        </div>
    );
};

export default AnalyticsTracker;