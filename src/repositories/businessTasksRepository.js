```javascript
const db = require('../config/db'); // Assuming a db configuration file
const Task = require('../models/Task');

class BusinessTasksRepository {
    static async createTask(taskData) {
        const { title, description, status } = taskData;
        const result = await db.one(
            'INSERT INTO business_tasks (title, description, status) VALUES ($1, $2, $3) RETURNING *',
            [title, description, status]
        );
        return new Task(result.id, result.title, result.description, result.status, result.created_at, result.updated_at);
    }

    // Additional CRUD operations...
}

module.exports = BusinessTasksRepository;
```