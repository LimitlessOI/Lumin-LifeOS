```typescript
import React from 'react';
import { useDrop } from 'react-dnd';

const Canvas: React.FC = () => {
  const [, drop] = useDrop({
    accept: 'component',
    drop: (item) => console.log('Dropped:', item),
  });

  return <div ref={drop} className="canvas">Canvas</div>;
};

export default Canvas;