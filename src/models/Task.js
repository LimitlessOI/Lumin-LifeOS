```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Task extends Model {}

Task.init({
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
}, {
  sequelize,
  modelName: 'Task',
  timestamps: true,
});

module.exports = Task;
```