```javascript
import React from 'react';
import ReactFlow, { addEdge, Background } from 'react-flow-renderer';

function NoCodeBuilder() {
  const [elements, setElements] = React.useState([]);

  const onConnect = (params) => setElements((els) => addEdge(params, els));

  return (
    <ReactFlow elements={elements} onConnect={onConnect}>
      <Background />
    </ReactFlow>
  );
}

export default NoCodeBuilder;
```