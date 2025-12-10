```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class ResearchTask extends Model {}

ResearchTask.init({
    task_details: {
        type: DataTypes.JSONB
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    }
}, {
    sequelize,
    modelName: 'ResearchTask',
    timestamps: true
});

module.exports = ResearchTask;
```