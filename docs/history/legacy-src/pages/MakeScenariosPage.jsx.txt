```javascript
import React from 'react';
import { MakeScenarioDashboard } from '../components/MakeScenarioDashboard/MakeScenarioDashboard';
import { MakeScenarioProvider } from '../contexts/MakeScenarioContext';

export const MakeScenariosPage = () => {
  return (
    <MakeScenarioProvider>
      <MakeScenarioDashboard />
    </MakeScenarioProvider>
  );
};