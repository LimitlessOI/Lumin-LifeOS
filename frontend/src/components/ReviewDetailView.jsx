```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const ReviewDetailView = () => {
  const { id } = useParams();
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    axios.get(`/api/reviews/${id}/feedback`)
      .then(response => setFeedback(response.data))
      .catch(error => console.error('Error fetching feedback:', error));
  }, [id]);

  return (
    <div>
      <h1>Review Detail View</h1>
      <ul>
        {feedback.map(fb => (
          <li key={fb.id}>
            {fb.feedback}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReviewDetailView;
```