```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Task = require('./Task');

class TaskActivity extends Model {}

TaskActivity.init({
  taskId: {
    type: DataTypes.INTEGER,
    references: {
      model: Task,
      key: 'id',
    },
  },
  activityType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  details: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  modelName: 'TaskActivity',
  timestamps: true,
});

module.exports = TaskActivity;
```