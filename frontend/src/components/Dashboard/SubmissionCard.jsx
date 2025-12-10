```jsx
import React from 'react';

const SubmissionCard = ({ submission }) => {
    return (
        <div className="border p-4 rounded shadow">
            <p><strong>User ID:</strong> {submission.user_id}</p>
            <p><strong>Code:</strong> {submission.code}</p>
            <p><strong>Submitted At:</strong> {new Date(submission.created_at).toLocaleString()}</p>
        </div>
    );
};

export default SubmissionCard;
```