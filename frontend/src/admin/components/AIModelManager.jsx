```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AIModelManager = () => {
    const [models, setModels] = useState([]);

    useEffect(() => {
        axios.get('/api/admin/ai-models')
            .then(response => setModels(response.data))
            .catch(error => console.error('Error fetching AI models:', error));
    }, []);

    const deployModel = (modelId) => {
        axios.post(`/api/admin/ai-models/deploy/${modelId}`)
            .then(response => alert('Model deployed successfully'))
            .catch(error => console.error('Error deploying model:', error));
    };

    return (
        <div>
            <h2>AI Model Manager</h2>
            <ul>
                {models.map(model => (
                    <li key={model.id}>
                        {model.name} - {model.version}
                        <button onClick={() => deployModel(model.id)}>Deploy</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AIModelManager;