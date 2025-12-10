```jsx
import React, { useEffect } from 'react';
import { useCodeReview } from '../../hooks/useCodeReview';
import SubmissionCard from './SubmissionCard';

const Dashboard = () => {
    const { submissions, fetchSubmissions } = useCodeReview();

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Code Submissions</h1>
            <div className="grid grid-cols-1 gap-4">
                {submissions.map(submission => (
                    <SubmissionCard key={submission.id} submission={submission} />
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
```