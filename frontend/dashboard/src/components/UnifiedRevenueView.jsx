```jsx
import React from 'react';

const UnifiedRevenueView = ({ revenueData }) => {
    return (
        <div>
            <h2>Revenue Streams</h2>
            <ul>
                {revenueData.map((stream) => (
                    <li key={stream.id}>
                        {stream.platformName}: ${stream.amount}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UnifiedRevenueView;
```