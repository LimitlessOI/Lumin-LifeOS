```jsx
import React, { useState } from 'react';
import api from '../../api';

const WorkflowEditor = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await api.post('/workflows', { name, description });
            setName('');
            setDescription('');
        } catch (error) {
            console.error('Error creating workflow:', error);
        }
    };

    return (
        <div className="workflow-editor">
            <h2>Create Workflow</h2>
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
                    placeholder="Workflow Description"
                />
                <button type="submit">Create</button>
            </form>
        </div>
    );
};

export default WorkflowEditor;
```