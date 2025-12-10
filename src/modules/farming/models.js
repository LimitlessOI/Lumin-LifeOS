```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres' });

const Farm = sequelize.define('Farm', {
  name: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
});

const CropCycle = sequelize.define('CropCycle', {
  farmId: { type: DataTypes.INTEGER, references: { model: Farm, key: 'id' } },
  cropType: { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
});

const SensorReading = sequelize.define('SensorReading', {
  farmId: { type: DataTypes.INTEGER, references: { model: Farm, key: 'id' } },
  type: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.FLOAT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

const RoboticTask = sequelize.define('RoboticTask', {
  farmId: { type: DataTypes.INTEGER, references: { model: Farm, key: 'id' } },
  taskType: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
});

const OptimizationLog = sequelize.define('OptimizationLog', {
  farmId: { type: DataTypes.INTEGER, references: { model: Farm, key: 'id' } },
  details: { type: DataTypes.JSON, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

module.exports = { sequelize, Farm, CropCycle, SensorReading, RoboticTask, OptimizationLog };
```