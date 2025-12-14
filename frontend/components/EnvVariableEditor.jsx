```javascript
import React from 'react';

const EnvVariableEditor = ({ variables, onChange }) => {
    const handleChange = (key, value) => {
        onChange({ ...variables, [key]: value });
    };

    return (
        <div>
            <h3>Edit Environment Variables</h3>
            {Object.keys(variables).map(key => (
                <div key={key}>
                    <label>{key}</label>
                    <input
                        type="text"
                        value={variables[key]}
                        onChange={e => handleChange(key, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
};

export default EnvVariableEditor;
```