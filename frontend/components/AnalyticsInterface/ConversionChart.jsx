import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

const ConversionChart = () => {
  const [data, setData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('/api/analytics/conversion-rate?totalVisitors=1000');
      const { conversionRate } = response.data;
      setData({
        labels: ['Current'],
        datasets: [{ label: 'Conversion Rate', data: [conversionRate], borderColor: 'rgba(75,192,192,1)' }]
      });
    };
    fetchData();
  }, []);

  return <Line data={data} />;
};

export default ConversionChart;