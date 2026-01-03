module.exports = (sequelize, dataTypes) => sequelize.define('Campaign', {
  id: {
    type: dataTypes.INTEGER(10).UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'campaign_id'
  },
  name: {
    type: DataTypes.STRING(256),
    allowNull: false
  }
}, {});