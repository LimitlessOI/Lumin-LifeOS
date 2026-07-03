```javascript
import React from 'react';

const ResultsDisplay = ({ data }) => {
    return (
        <div>
            <h1>Code Review Results</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

export default ResultsDisplay;