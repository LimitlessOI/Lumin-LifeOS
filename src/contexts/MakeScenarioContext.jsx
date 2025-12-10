```javascript
import React, { createContext, useState, useEffect } from 'react';
import { fetchScenarios } from '../services/makeApi';

export const MakeScenarioContext = createContext();

export const MakeScenarioProvider = ({ children }) => {
  const [scenarios, setScenarios] = useState([]);

  useEffect(() => {
    async function loadScenarios() {
      const data = await fetchScenarios();
      setScenarios(data);
    }
    loadScenarios();
  }, []);

  return (
    <MakeScenarioContext.Provider value={{ scenarios, setScenarios }}>
      {children}
    </MakeScenarioContext.Provider>
  );
};