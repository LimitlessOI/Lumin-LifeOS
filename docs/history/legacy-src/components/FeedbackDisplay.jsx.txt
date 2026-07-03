```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function FeedbackDisplay({ reviewId }) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await axios.get(`/api/code-review/status/${reviewId}`);
        setFeedback(response.data.feedback);
      } catch (error) {
        console.error('Error fetching feedback:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [reviewId]);

  return (
    <div>
      {loading ? 'Loading feedback...' : <pre>{feedback}</pre>}
    </div>
  );
}

export default FeedbackDisplay;