```javascript
import React from 'react';
import ProcessCard from './ProcessCard';
import { useProcesses } from '../../hooks/useProcesses';

const ProcessList = () => {
    const { data: processes, error, isLoading } = useProcesses();

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading processes</div>;

    return (
        <div className="process-list">
            {processes.map(process => (
                <ProcessCard key={process.id} process={process} />
            ))}
        </div>
    );
};

export default ProcessList;
```