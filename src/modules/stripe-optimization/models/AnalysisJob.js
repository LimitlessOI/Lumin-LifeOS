```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../../../database');

class AnalysisJob extends Model {}

AnalysisJob.init({
  clientId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'stripe_optimization_clients',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  result: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AnalysisJob',
  tableName: 'analysis_jobs',
  timestamps: true
});

module.exports = AnalysisJob;
```