```javascript
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/connection');

class User extends Model {}
User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  encryptedData: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, { sequelize, modelName: 'user' });

class TherapySession extends Model {}
TherapySession.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, { sequelize, modelName: 'therapySession' });

class CrisisLog extends Model {}
CrisisLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  detectedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, { sequelize, modelName: 'crisisLog' });

module.exports = { User, TherapySession, CrisisLog };
```