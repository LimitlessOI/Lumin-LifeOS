```jsx
import React, { useEffect, useState } from 'react';
import InsightCard from './InsightCard';
import InsightFilters from './InsightFilters';
import { fetchInsights } from '../../services/insightService';

const ReviewInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', confidence: 0 });

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);
      const data = await fetchInsights();
      setInsights(data);
      setLoading(false);
    }
    loadInsights();
  }, []);

  const filteredInsights = insights.filter(insight => {
    return (filter.type ? insight.type === filter.type : true) &&
           (insight.confidence_score >= filter.confidence);
  });

  return (
    <div className="review-insights">
      <InsightFilters filter={filter} setFilter={setFilter} />
      {loading ? <p>Loading...</p> : filteredInsights.map(insight => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
};

export default ReviewInsights;
```