```javascript
import React from 'react';
import RecommendationCard from './RecommendationCard';
import useRecommendations from '../../hooks/useRecommendations';

function RecommendationsDashboard() {
  const { recommendations } = useRecommendations();

  return (
    <div className="recommendations-dashboard">
      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </div>
  );
}

export default RecommendationsDashboard;
```