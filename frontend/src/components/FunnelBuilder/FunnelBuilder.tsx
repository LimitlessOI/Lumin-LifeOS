```typescript
import React from 'react';
import Canvas from './Canvas';
import ComponentPalette from './ComponentPalette';

const FunnelBuilder: React.FC = () => {
  return (
    <div className="funnel-builder">
      <ComponentPalette />
      <Canvas />
    </div>
  );
};

export default FunnelBuilder;