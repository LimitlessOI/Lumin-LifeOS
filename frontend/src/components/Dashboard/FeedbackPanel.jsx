```jsx
import React, { useState } from 'react';
import { useCodeReview } from '../../hooks/useCodeReview';

const FeedbackPanel = ({ submissionId }) => {
    const [feedback, setFeedback] = useState('');
    const { addReview } = useCodeReview();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addReview(submissionId, feedback);
        setFeedback('');
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t">
            <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter your feedback"
            />
            <button type="submit" className="mt-2 p-2 bg-blue-500 text-white rounded">Submit Feedback</button>
        </form>
    );
};

export default FeedbackPanel;
```