```javascript
import React from 'react';

const ErrorDisplay = ({ message }) => {
    return (
        <div style={{ color: 'red' }}>
            <h1>Error</h1>
            <p>{message}</p>
        </div>
    );
};

export default ErrorDisplay;