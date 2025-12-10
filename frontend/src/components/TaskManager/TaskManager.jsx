```javascript
import React from 'react';
import TaskList from './TaskList';
import TaskForm from './TaskForm';

const TaskManager = () => {
  return (
    <div>
      <h1>Task Manager</h1>
      <TaskForm />
      <TaskList />
    </div>
  );
};

export default TaskManager;
```