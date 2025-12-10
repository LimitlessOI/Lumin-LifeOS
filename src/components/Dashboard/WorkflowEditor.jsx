```javascript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchWorkflowById, updateWorkflow } from '../../services/workflowApi';

const WorkflowEditor = () => {
    const { id } = useParams();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWorkflow = async () => {
            try {
                const data = await fetchWorkflowById(id);
                setName(data.name);
                setDescription(data.description);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadWorkflow();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateWorkflow(id, { name, description });
            alert('Workflow updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h1>Edit Workflow</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Workflow Name"
                    required
                />
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update'}
                </button>
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            </form>
        </div>
    );
};

export default WorkflowEditor;