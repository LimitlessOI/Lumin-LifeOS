```jsx
import React from 'react';
import GridLayout from 'react-grid-layout';

const LayoutCustomizer = () => {
    const layout = [
        { i: 'a', x: 0, y: 0, w: 1, h: 2, static: true },
        { i: 'b', x: 1, y: 0, w: 3, h: 2 },
        { i: 'c', x: 4, y: 0, w: 1, h: 2 }
    ];

    return (
        <div className="layout-customizer">
            <h2>Customize Layout</h2>
            <GridLayout className="layout" layout={layout} cols={12} rowHeight={30} width={1200}>
                <div key="a">A</div>
                <div key="b">B</div>
                <div key="c">C</div>
            </GridLayout>
        </div>
    );
};

export default LayoutCustomizer;
```