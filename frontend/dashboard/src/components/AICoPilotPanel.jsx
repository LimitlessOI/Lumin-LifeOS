```jsx
import React from 'react';

const AICoPilotPanel = ({ recommendations }) => {
    return (
        <div>
            <h2>AI Recommendations</h2>
            <ul>
                {recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                ))}
            </ul>
        </div>
    );
};

export default AICoPilotPanel;
```