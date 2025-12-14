```javascript
import React from 'react';
import TaskForm from './TaskForm';
import { ThemeProvider } from 'styled-components';
import theme from '../../theme'; // Assuming a theme.js file exists

const TaskEditorUI = ({ tasks, loading, error, onCreateTask, onUpdateTask, onDeleteTask }) => {
    return (
        <ThemeProvider theme={theme}>
            <div className="task-editor-ui">
                {loading && <p>Loading tasks...</p>}
                {error && <p className="error">{error}</p>}
                <TaskForm onSubmit={onCreateTask} />
                <ul>
                    {tasks.map(task => (
                        <li key={task.id}>
                            <h3>{task.title}</h3>
                            <p>{task.description}</p>
                            <button onClick={() => onUpdateTask(task.id, task)}>Edit</button>
                            <button onClick={() => onDeleteTask(task.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            </div>
        </ThemeProvider>
    );
};

export default TaskEditorUI;
```