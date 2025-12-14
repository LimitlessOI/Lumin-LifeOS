```javascript
import React, { useState, useEffect } from 'react';

const EnvTemplateSelector = ({ onSelectTemplate }) => {
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        fetch('/api/templates')
            .then(response => response.json())
            .then(data => setTemplates(data));
    }, []);

    return (
        <div>
            <h3>Select an Environment Template</h3>
            <ul>
                {templates.map(template => (
                    <li key={template.id} onClick={() => onSelectTemplate(template)}>
                        {template.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default EnvTemplateSelector;
```