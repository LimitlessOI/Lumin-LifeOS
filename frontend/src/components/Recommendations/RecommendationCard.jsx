```javascript
import React from 'react';

function RecommendationCard({ recommendation }) {
  return (
    <div className="recommendation-card">
      <p>{recommendation.recommendation}</p>
    </div>
  );
}

export default RecommendationCard;
```