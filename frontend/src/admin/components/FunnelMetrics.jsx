```javascript
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import useAdminWebSocket from '../hooks/useAdminWebSocket';

const FunnelMetrics = () => {
    const [metrics, setMetrics] = useState([]);
    const updateMetrics = useAdminWebSocket('wss://your-websocket-url', setMetrics);

    useEffect(() => {
        // Fetch initial data or rely on WebSocket updates
        fetch('/api/admin/funnel-performance')
            .then(response => response.json())
            .then(data => setMetrics(data));
    }, []);

    return (
        <div>
            <h2>Funnel Metrics</h2>
            <LineChart width={600} height={300} data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
            </LineChart>
        </div>
    );
};

export default FunnelMetrics;