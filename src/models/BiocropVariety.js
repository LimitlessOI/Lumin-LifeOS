const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/connection');

class BiocropVariety extends Model {}

BiocropVariety.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  genome_sequence: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'BiocropVariety',
  tableName: 'biocrop_varieties',
  timestamps: true
});

module.exports = BiocropVariety;