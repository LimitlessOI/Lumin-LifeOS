const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const OutreachLead = sequelize.define('OutreachLead', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  website: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'outreach_leads',
});

module.exports = OutreachLead;
