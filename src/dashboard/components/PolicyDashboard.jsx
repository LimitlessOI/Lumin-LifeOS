```jsx
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';

const PolicyDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/climate/recommendations')
      .then(response => setData(response.data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  const chartData = {
    labels: data.map(d => d.id),
    datasets: [{
      label: 'Policy Recommendation Impact',
      data: data.map(d => d.impact),
      backgroundColor: 'rgba(75,192,192,0.4)'
    }]
  };

  return (
    <div>
      <h2>Policy Dashboard</h2>
      <Bar data={chartData} />
    </div>
  );
};

export default PolicyDashboard;
```