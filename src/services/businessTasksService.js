```javascript
const BusinessTasksRepository = require('../repositories/businessTasksRepository');

class BusinessTasksService {
    static async createTask(taskData) {
        // Validate task data
        const { error } = Task.validate(taskData);
        if (error) throw new Error(error.details[0].message);
        
        // Create task in repository
        return await BusinessTasksRepository.createTask(taskData);
    }

    // Additional business logic...
}

module.exports = BusinessTasksService;
```