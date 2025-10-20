const { Sequelize } = require('sequelize');
const config = require('./config/config');

const sequelize = new Sequelize(config.database);

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (error) {
    throw new Error('Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, connectToDatabase };
