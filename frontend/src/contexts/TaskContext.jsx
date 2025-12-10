```javascript
import React, { createContext, useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';

export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const { fetchTasks } = useTasks();

  useEffect(() => {
    (async () => {
      const fetchedTasks = await fetchTasks();
      setTasks(fetchedTasks);
    })();
  }, [fetchTasks]);

  return (
    <TaskContext.Provider value={{ tasks, setTasks }}>
      {children}
    </TaskContext.Provider>
  );
};
```