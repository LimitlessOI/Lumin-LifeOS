```jsx
import React, { useState } from 'react';
import useAnalysis from '../../hooks/useAnalysis';
import './AnalysisTrigger.css';

const AnalysisTrigger = () => {
    const [name, setName] = useState('');
    const { triggerAnalysis, analysis } = useAnalysis();

    const handleSubmit = (e) => {
        e.preventDefault();
        triggerAnalysis(name);
    };

    return (
        <div className="analysis-trigger">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter analysis name"
                />
                <button type="submit">Trigger Analysis</button>
            </form>
            {analysis && <div className="analysis-result">Status: {analysis.status}</div>}
        </div>
    );
};

export default AnalysisTrigger;
```