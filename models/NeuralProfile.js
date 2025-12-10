const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class NeuralProfile extends Model {}

NeuralProfile.init({
  userId: DataTypes.INTEGER,
  profileData: DataTypes.JSON
}, { sequelize, modelName: 'neural_profile' });

module.exports = NeuralProfile;