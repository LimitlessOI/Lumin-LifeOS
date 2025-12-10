```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

class AiModelFunnel extends Model {}

AiModelFunnel.init({
  ai_model_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ai_models',
      key: 'id'
    }
  },
  funnel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'funnels',
      key: 'id'
    }
  },
  performance_metrics: {
    type: DataTypes.JSONB,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'AiModelFunnel',
  tableName: 'ai_model_funnel_data',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AiModelFunnel;
```