const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class NeuralSession extends Model {}

NeuralSession.init({
  profileId: DataTypes.INTEGER,
  sessionData: DataTypes.JSON
}, { sequelize, modelName: 'neural_session' });

module.exports = NeuralSession;