import React, { useEffect, useState } from 'react';
import api from '../services/api';

const FunnelAnalytics = () => {
  const [funnelData, setFunnelData] = useState([]);

  useEffect(() => {
    api.getFunnelMetrics().then(data => setFunnelData(data));
  }, []);

  return (
    <div>
      <h2>Funnel Analytics</h2>
      <ul>
        {funnelData.map((item, index) => (
          <li key={index}>{item.name}: {item.value}</li>
        ))}
      </ul>
    </div>
  );
};

export default FunnelAnalytics;