```jsx
import React from 'react';
import { useProjectFeedback } from '../../hooks/useProjectDetails';

const FeedbackSection = ({ projectId }) => {
    const { data: feedback, isLoading, error } = useProjectFeedback(projectId);

    if (isLoading) return <div>Loading feedback...</div>;
    if (error) return <div>Error loading feedback</div>;

    return (
        <div className="feedback-section">
            <h2>Feedback</h2>
            {feedback.map((item) => (
                <div key={item.id} className="feedback-item">
                    <p>{item.feedback}</p>
                </div>
            ))}
        </div>
    );
};

export default FeedbackSection;
```