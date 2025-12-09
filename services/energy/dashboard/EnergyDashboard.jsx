```javascript
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';

const EnergyDashboard = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch('/api/energy/data')
            .then(response => response.json())
            .then(data => setData(data));
    }, []);

    const chartData = {
        labels: data.map(d => d.timestamp),
        datasets: [
            {
                label: 'Energy Consumption',
                data: data.map(d => d.energy_consumed),
                borderColor: 'rgba(75,192,192,1)',
                fill: false
            },
            {
                label: 'Energy Generation',
                data: data.map(d => d.energy_generated),
                borderColor: 'rgba(153,102,255,1)',
                fill: false
            }
        ]
    };

    return (
        <div>
            <h2>Energy Dashboard</h2>
            <Line data={chartData} />
        </div>
    );
};

export default EnergyDashboard;
```