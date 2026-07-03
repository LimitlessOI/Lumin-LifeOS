```javascript
import React from 'react';
import ProcessList from './ProcessList';
import ExecutionHistory from './ExecutionHistory';
import MetricsPanel from './MetricsPanel';
import ControlsPanel from './ControlsPanel';

const BusinessProcessDashboard = () => {
    return (
        <div className="business-process-dashboard">
            <ProcessList />
            <ExecutionHistory />
            <MetricsPanel />
            <ControlsPanel />
        </div>
    );
};

export default BusinessProcessDashboard;
```