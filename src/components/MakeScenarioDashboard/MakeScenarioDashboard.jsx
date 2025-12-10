```javascript
import React from 'react';
import { ScenarioList } from './ScenarioList';
import { ScenarioForm } from './ScenarioForm';

export const MakeScenarioDashboard = () => {
  return (
    <div>
      <h1>Make Scenario Dashboard</h1>
      <ScenarioForm />
      <ScenarioList />
    </div>
  );
};