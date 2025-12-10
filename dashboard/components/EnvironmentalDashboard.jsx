```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EnvironmentalDashboard() {
    const [status, setStatus] = useState('Idle');

    const handleOptimizeClick = async () => {
        setStatus('Optimizing...');
        try {
            await axios.get('/api/environment/optimize');
            setStatus('Optimization completed');
        } catch (error) {
            console.error('Error during optimization:', error);
            setStatus('Optimization failed');
        }
    };

    return (
        <div>
            <h1>Environmental Dashboard</h1>
            <button onClick={handleOptimizeClick}>Optimize Environment</button>
            <p>Status: {status}</p>
        </div>
    );
}

export default EnvironmentalDashboard;
```