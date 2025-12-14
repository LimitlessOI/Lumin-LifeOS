```javascript
import React from 'react';

const TaskDetailsModal = ({ task, onClose }) => {
  if (!task) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{task.name}</h2>
        <p>{task.description}</p>
        <p>Status: {task.status}</p>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
```