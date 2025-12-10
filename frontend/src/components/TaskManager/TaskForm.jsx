```javascript
import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';

const TaskForm = () => {
  const [name, setName] = useState('');
  const { addTask } = useTasks();

  const handleSubmit = (e) => {
    e.preventDefault();
    addTask({ name });
    setName('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Task Name" 
        required 
      />
      <button type="submit">Add Task</button>
    </form>
  );
};

export default TaskForm;
```