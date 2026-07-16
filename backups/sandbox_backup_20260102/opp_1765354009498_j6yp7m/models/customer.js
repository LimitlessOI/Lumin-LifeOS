/**
 * SYNOPSIS: js — backups/sandbox_backup_20260102/opp_1765354009498_j6yp7m/models/customer.js.
 */
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