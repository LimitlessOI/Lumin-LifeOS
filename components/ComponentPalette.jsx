```jsx
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const ComponentPalette = () => {
  const components = ['Component 1', 'Component 2', 'Component 3'];
  return (
    <div>
      {components.map((component, index) => (
        <Draggable key={component} draggableId={component} index={index}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              {component}
            </div>
          )}
        </Draggable>
      ))}
    </div>
  );
};

export default ComponentPalette;
```