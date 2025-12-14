```jsx
import React, { createContext, useState } from 'react';

export const WorkflowContext = createContext();

export const WorkflowProvider = ({ children }) => {
  const [workflows, setWorkflows] = useState([]);

  return (
    <WorkflowContext.Provider value={{ workflows, setWorkflows }}>
      {children}
    </WorkflowContext.Provider>
  );
};
```