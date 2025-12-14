```typescript
import React from 'react';
import { useDrag } from 'react-dnd';

const ComponentPalette: React.FC = () => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: { type: 'exampleComponent' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return <div ref={drag} className="component-palette">Component</div>;
};

export default ComponentPalette;