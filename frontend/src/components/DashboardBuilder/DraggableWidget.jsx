```jsx
import React from 'react';
import { useDrag } from 'react-dnd';

const DraggableWidget = ({ id, name }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'WIDGET',
        item: { id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
            {name}
        </div>
    );
};

export default DraggableWidget;
```