```javascript
import taskApi from '../services/taskApi';
import axios from 'axios';

jest.mock('axios');

describe('taskApi', () => {
    it('fetches tasks successfully from API', async () => {
        const data = [{ id: 1, title: 'Test Task' }];
        axios.get.mockResolvedValueOnce({ data });

        const result = await taskApi.getAllTasks();
        expect(result.data).toEqual(data);
    });

    it('creates a task successfully', async () => {
        const task = { title: 'New Task', status: 'pending' };
        axios.post.mockResolvedValueOnce({ data: { id: 2, ...task } });

        const result = await taskApi.createTask(task);
        expect(result.data).toEqual({ id: 2, ...task });
    });
});
```