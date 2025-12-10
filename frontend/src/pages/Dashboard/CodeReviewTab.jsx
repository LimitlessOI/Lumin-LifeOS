```jsx
import React, { useState } from 'react';
import SubmissionForm from '../../components/CodeReview/SubmissionForm';
import ResultsPanel from '../../components/CodeReview/ResultsPanel';

function CodeReviewTab() {
    const [results, setResults] = useState('');

    const handleNewResults = (newResults) => {
        setResults(newResults);
    };

    return (
        <div>
            <h1>Code Review</h1>
            <SubmissionForm onResults={handleNewResults} />
            <ResultsPanel results={results} />
        </div>
    );
}

export default CodeReviewTab;
```