```javascript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkflows } from '../../services/workflowApi';
import { fetchWorkflowsStart, fetchWorkflowsSuccess, fetchWorkflowsFailure } from '../../store/slices/workflowSlice';

const WorkflowList = () => {
    const dispatch = useDispatch();
    const { workflows, loading, error } = useSelector(state => state.workflow);

    useEffect(() => {
        const loadWorkflows = async () => {
            dispatch(fetchWorkflowsStart());
            try {
                const data = await fetchWorkflows();
                dispatch(fetchWorkflowsSuccess(data));
            } catch (err) {
                dispatch(fetchWorkflowsFailure(err.message));
            }
        };
        loadWorkflows();
    }, [dispatch]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h1>Workflow List</h1>
            <ul>
                {workflows.map(workflow => (
                    <li key={workflow.id}>
                        {workflow.name} - <span>Status Badge</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WorkflowList;