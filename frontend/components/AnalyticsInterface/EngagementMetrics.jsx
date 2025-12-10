import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EngagementMetrics = () => {
  const [metrics, setMetrics] = useState({ uniqueEventTypes: 0 });

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await axios.get('/api/analytics/engagement-metrics');
      setMetrics(response.data);
    };
    fetchMetrics();
  }, []);

  return (
    <div>
      <h2>Engagement Metrics</h2>
      <p>Unique Event Types: {metrics.uniqueEventTypes}</p>
    </div>
  );
};

export default EngagementMetrics;