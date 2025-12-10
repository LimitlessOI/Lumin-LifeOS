```jsx
import React, { useState, useEffect } from 'react';

export function FinanceDashboard() {
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        // Fetch recommendations from the API
        fetch('/api/finance/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1, tickers: ['AAPL', 'GOOGL'] })
        })
        .then(response => response.json())
        .then(data => setRecommendations(data))
        .catch(error => console.error('Error fetching recommendations:', error));
    }, []);

    return (
        <div>
            <h1>Investment Recommendations</h1>
            <ul>
                {recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                ))}
            </ul>
        </div>
    );
}
```