const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OutreachLead = sequelize.define('OutreachLead', {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

module.exports = OutreachLead;