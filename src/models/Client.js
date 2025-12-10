const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Client extends Model {}

Client.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  }
}, {
  sequelize,
  modelName: 'Client',
  timestamps: false
});

module.exports = Client;