```javascript
const BusinessTasksService = require('../services/businessTasksService');

class BusinessTasksController {
    static async createTask(req, res) {
        try {
            const task = await BusinessTasksService.createTask(req.body);
            res.status(201).json(task);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Additional controller methods...
}

module.exports = BusinessTasksController;
```