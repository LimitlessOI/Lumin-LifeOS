const { DataTypes } = require('sequelize');
module.exports = (sequelize, dataTypes) => sequelize.define('Customer', {
  id: {
    type: dataTypes.INTEGER(10).UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'customer_id'
  },
  name: {
    type: dataTypes.STRING(256),
    allowNull: false,
    unique: true
  },
  email: {
    type: dataTypes.STRING(100),
    allowNull: false,
    unique: true
  }
}, {});