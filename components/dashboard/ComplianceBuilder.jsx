import React, { useState } from 'react';

function ComplianceBuilder() {
    const [template, setTemplate] = useState('');

    const saveTemplate = () => {
        // Mock save logic
        console.log('Template saved:', template);
    };

    return (
        <div>
            <h2>Compliance Template Builder</h2>
            <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Enter compliance template"
            />
            <button onClick={saveTemplate}>Save Template</button>
        </div>
    );
}

export default ComplianceBuilder;