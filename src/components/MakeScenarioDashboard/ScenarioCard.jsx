```javascript
import React from 'react';

export const ScenarioCard = ({ scenario }) => {
  return (
    <div>
      <h2>{scenario.name}</h2>
      <p>{scenario.description}</p>
    </div>
  );
};