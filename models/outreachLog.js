const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const OutreachLog = sequelize.define('OutreachLog', {
  lead_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  outcome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recording_url: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, { timestamps: false });

module.exports = OutreachLog;
