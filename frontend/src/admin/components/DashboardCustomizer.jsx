```javascript
import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardCustomizer = () => {
    const layout = [
        { i: 'a', x: 0, y: 0, w: 2, h: 2 },
        { i: 'b', x: 2, y: 0, w: 2, h: 2 },
        { i: 'c', x: 4, y: 0, w: 2, h: 2 }
    ];

    return (
        <div>
            <h2>Dashboard Customizer</h2>
            <ResponsiveGridLayout className="layout" layouts={{ lg: layout }} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}>
                <div key="a" className="widget">Widget A</div>
                <div key="b" className="widget">Widget B</div>
                <div key="c" className="widget">Widget C</div>
            </ResponsiveGridLayout>
        </div>
    );
};

export default DashboardCustomizer;