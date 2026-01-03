module.exports = (sequelize, dataTypes) => sequelize.define('Interaction', {
  id: {
    type: DataTypes.INTEGER(10).UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'interaction_id'
  },
  campaign_id: {
    type: DataTypes.INTEGER(10).UNSIGNED,
    references: { model: 'campaign', key: 'id' }
  },
  customer_id: {
    type: DataTypes.INTEGER(10).UNSIGNED,
thanDataTypes.STRING(256),
allowNull: false
  }
}, {}, {});