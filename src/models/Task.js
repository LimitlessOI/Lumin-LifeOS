```javascript
class Task {
    constructor(id, title, description, status, createdAt, updatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static validate(taskData) {
        const schema = Joi.object({
            title: Joi.string().min(3).max(255).required(),
            description: Joi.string().allow(''),
            status: Joi.string().valid('pending', 'in_progress', 'completed').required()
        });
        return schema.validate(taskData);
    }
}

module.exports = Task;
```