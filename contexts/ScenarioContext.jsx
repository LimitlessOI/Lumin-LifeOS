```jsx
import React, { createContext, useContext } from 'react';
import create from 'zustand';

const ScenarioContext = createContext();

export const useScenarioContext = () => {
  return useContext(ScenarioContext);
};

export const ScenarioProvider = ({ children }) => {
  const store = useScenarioStore();
  return (
    <ScenarioContext.Provider value={store}>
      {children}
    </ScenarioContext.Provider>
  );
};

const useScenarioStore = create(set => ({
  scenarios: [],
  addScenario: (scenario) => set(state => ({
    scenarios: [...state.scenarios, scenario]
  }))
}));
```