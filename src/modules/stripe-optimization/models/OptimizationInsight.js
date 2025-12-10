```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../../../database');

class OptimizationInsight extends Model {}

OptimizationInsight.init({
  clientId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'stripe_optimization_clients',
      key: 'id'
    }
  },
  insightData: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'OptimizationInsight',
  tableName: 'optimization_insights',
  timestamps: true
});

module.exports = OptimizationInsight;
```