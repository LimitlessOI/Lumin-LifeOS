```jsx
import React, { useState, useEffect } from 'react';
import useMakeApi from '../hooks/useMakeApi';

const ScenarioList = () => {
  const [scenarios, setScenarios] = useState([]);
  const { fetchScenarios } = useMakeApi();

  useEffect(() => {
    (async () => {
      const data = await fetchScenarios();
      setScenarios(data);
    })();
  }, [fetchScenarios]);

  return (
    <div>
      <h2>Scenario List</h2>
      <ul>
        {scenarios.map((scenario) => (
          <li key={scenario.id}>{scenario.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ScenarioList;