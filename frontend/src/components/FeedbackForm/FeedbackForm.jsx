```jsx
import React from 'react';
import './FeedbackForm.css';
import useFeedbackForm from '../../hooks/useFeedbackForm';

const FeedbackForm = () => {
    const { formState, handleInputChange, handleSubmit, error } = useFeedbackForm();

    return (
        <form className="feedback-form" onSubmit={handleSubmit}>
            <textarea
                name="feedback_text"
                value={formState.feedback_text}
                onChange={handleInputChange}
                placeholder="Your feedback"
                required
            ></textarea>
            {error && <div className="error">{error}</div>}
            <button type="submit">Submit Feedback</button>
        </form>
    );
};

export default FeedbackForm;
```