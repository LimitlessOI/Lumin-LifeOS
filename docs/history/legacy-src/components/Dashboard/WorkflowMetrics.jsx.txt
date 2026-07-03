```javascript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchWorkflowMetrics } from '../../services/workflowApi';

const WorkflowMetrics = () => {
    const { id } = useParams();
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const data = await fetchWorkflowMetrics(id);
                setMetrics(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadMetrics();
    }, [id]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h1>Workflow Metrics</h1>
            <ul>
                {metrics.map(metric => (
                    <li key={metric.id}>
                        {metric.metric_name}: {metric.metric_value}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WorkflowMetrics;