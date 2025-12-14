```jsx
import React from 'react';
import ComponentPalette from './ComponentPalette';
import Canvas from './Canvas';
import PreviewPanel from './PreviewPanel';
import ValidationPanel from './ValidationPanel';

const ScenarioBuilder = () => {
  return (
    <div>
      <ComponentPalette />
      <Canvas />
      <PreviewPanel />
      <ValidationPanel />
    </div>
  );
};

export default ScenarioBuilder;
```