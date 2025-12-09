```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class ResilienceProfile extends Model {}

ResilienceProfile.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  baselineData: {
    type: DataTypes.JSONB,
    allowNull: true,
  }
}, {
  sequelize,
  modelName: 'ResilienceProfile',
  timestamps: true,
});

module.exports = ResilienceProfile;
```