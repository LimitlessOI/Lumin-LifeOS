```jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';

const WorkflowList = () => {
    const [workflows, setWorkflows] = useState([]);

    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const response = await api.get('/workflows');
                setWorkflows(response.data);
            } catch (error) {
                console.error('Error fetching workflows:', error);
            }
        };

        fetchWorkflows();
    }, []);

    return (
        <div className="workflow-list">
            <h2>Workflows</h2>
            <ul>
                {workflows.map(workflow => (
                    <li key={workflow.id}>{workflow.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default WorkflowList;
```