```jsx
import React from 'react';
import WorkflowList from './WorkflowList';
import WorkflowEditor from './WorkflowEditor';
import AnalyticsCharts from './AnalyticsCharts';
import LayoutCustomizer from './LayoutCustomizer';

const WorkflowDashboard = () => {
    return (
        <div className="workflow-dashboard">
            <h1>Workflow Dashboard</h1>
            <WorkflowList />
            <WorkflowEditor />
            <AnalyticsCharts />
            <LayoutCustomizer />
        </div>
    );
};

export default WorkflowDashboard;
```