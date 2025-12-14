```jsx
import React from 'react';

function ResultsPanel({ results }) {
    return (
        <div>
            <h2>Analysis Results</h2>
            <pre>{results}</pre>
        </div>
    );
}

export default ResultsPanel;
```