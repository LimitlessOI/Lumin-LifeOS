```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../../../database'); // Adjust the path as necessary

class OptimizationClient extends Model {}

OptimizationClient.init({
  apiKey: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'OptimizationClient',
  tableName: 'stripe_optimization_clients',
  timestamps: true
});

module.exports = OptimizationClient;
```