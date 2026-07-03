```javascript
import React, { useState, useEffect } from 'react';
import TaskEditorUI from './TaskEditorUI';
import taskApi from '../../services/taskApi';

const TaskEditorContainer = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await taskApi.getAllTasks();
                setTasks(response.data);
            } catch (err) {
                setError('Error fetching tasks');
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const handleCreateTask = async (task) => {
        try {
            const response = await taskApi.createTask(task);
            setTasks([...tasks, response.data]);
        } catch (err) {
            setError('Error creating task');
        }
    };

    const handleUpdateTask = async (id, task) => {
        try {
            const response = await taskApi.updateTask(id, task);
            setTasks(tasks.map(t => t.id === id ? response.data : t));
        } catch (err) {
            setError('Error updating task');
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await taskApi.deleteTask(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            setError('Error deleting task');
        }
    };

    return (
        <TaskEditorUI
            tasks={tasks}
            loading={loading}
            error={error}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
        />
    );
};

export default TaskEditorContainer;
```