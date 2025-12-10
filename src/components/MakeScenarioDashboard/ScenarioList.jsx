```javascript
import React from 'react';
import { useMakeScenarios } from '../../hooks/useMakeScenarios';
import { ScenarioCard } from './ScenarioCard';

export const ScenarioList = () => {
  const { scenarios } = useMakeScenarios();

  return (
    <div>
      {scenarios.map(scenario => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
};