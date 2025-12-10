```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class BiometricStream extends Model {}

BiometricStream.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  recordedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'BiometricStream',
  timestamps: false,
});

module.exports = BiometricStream;
```