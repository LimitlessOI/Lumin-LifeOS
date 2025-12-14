```jsx
import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import ProcessMonitorWidget from './ProcessMonitorWidget';
import TaskMetricsWidget from './TaskMetricsWidget';
import CustomWidget from './CustomWidget';
import './Dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardContainer = () => {
    const layout = [
        { i: 'processMonitor', x: 0, y: 0, w: 4, h: 2 },
        { i: 'taskMetrics', x: 4, y: 0, w: 4, h: 2 },
        { i: 'customWidget', x: 8, y: 0, w: 4, h: 2 }
    ];

    return (
        <ResponsiveGridLayout className="layout" layouts={{ lg: layout }} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}>
            <div key="processMonitor"><ProcessMonitorWidget /></div>
            <div key="taskMetrics"><TaskMetricsWidget /></div>
            <div key="customWidget"><CustomWidget /></div>
        </ResponsiveGridLayout>
    );
};

export default DashboardContainer;
```