```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
});

const Task = sequelize.define('Task', {
  description: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
});

const SelfProgrammingLog = sequelize.define('SelfProgrammingLog', {
  action: { type: DataTypes.STRING, allowNull: false },
  result: { type: DataTypes.TEXT, allowNull: true },
});

const RevenueEvent = sequelize.define('RevenueEvent', {
  amount: { type: DataTypes.DECIMAL, allowNull: false },
  currency: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'created' },
});

module.exports = { sequelize, User, Task, SelfProgrammingLog, RevenueEvent };
```