```javascript
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { getTrends } from '../../services/analyticsService';

const TrendsChart = () => {
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchTrends = async () => {
      const data = await getTrends();
      setTrendData(data);
    };
    fetchTrends();
  }, []);

  const data = {
    labels: trendData.map(data => data.metric),
    datasets: [
      {
        label: 'Trends',
        data: trendData.map(data => data.value),
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  return (
    <div>
      <h2>Trends Over Time</h2>
      <Line data={data} />
    </div>
  );
};

export default TrendsChart;