```javascript
import React from 'react';
import { Handle } from 'react-flow-renderer';

const CustomNode = ({ data }) => {
    return (
        <div style={{ padding: 10, borderRadius: 5, border: '1px solid #ddd' }}>
            <Handle type="target" position="top" />
            <div>{data.label}</div>
            <Handle type="source" position="bottom" />
        </div>
    );
};

export default CustomNode;