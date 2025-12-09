```jsx
import React, { useState } from 'react';

function ModelConfigurator() {
    const [config, setConfig] = useState({ name: '', description: '' });

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        // Logic to submit configuration
        console.log('Config submitted:', config);
    };

    return (
        <div>
            <h2>Model Configurator</h2>
            <input type="text" name="name" value={config.name} onChange={handleChange} placeholder="Model Name" />
            <textarea name="description" value={config.description} onChange={handleChange} placeholder="Description"></textarea>
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
}

export default ModelConfigurator;
```