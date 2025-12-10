```js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Assuming a configured Sequelize instance

class LearningProfile extends Model {}

LearningProfile.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'LearningProfile',
  tableName: 'learning_profiles'
});

module.exports = LearningProfile;
```