```javascript
import React, { useContext } from 'react';
import { TaskContext } from '../../contexts/TaskContext';

const TaskList = () => {
  const { tasks } = useContext(TaskContext);

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.name}</li>
      ))}
    </ul>
  );
};

export default TaskList;
```