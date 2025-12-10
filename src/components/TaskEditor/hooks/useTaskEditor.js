```javascript
import { useState, useEffect } from 'react';
import taskApi from '../../../services/taskApi';

export const useTaskEditor = () => {
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

    const createTask = async (task) => {
        try {
            const response = await taskApi.createTask(task);
            setTasks([...tasks, response.data]);
        } catch (err) {
            setError('Error creating task');
        }
    };

    const updateTask = async (id, task) => {
        try {
            const response = await taskApi.updateTask(id, task);
            setTasks(tasks.map(t => t.id === id ? response.data : t));
        } catch (err) {
            setError('Error updating task');
        }
    };

    const deleteTask = async (id) => {
        try {
            await taskApi.deleteTask(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) {
            setError('Error deleting task');
        }
    };

    return { tasks, loading, error, createTask, updateTask, deleteTask };
};
```