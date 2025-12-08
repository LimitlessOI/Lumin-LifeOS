const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'postgres'
});

const EnergyDevice = require('./energy_device')(sequelize);
const DeviceMetric = require('./device_metric')(sequelize);
const PredictiveMaintenance = require('./predictive_maintenance')(sequelize);
const DemandResponseEvent = require('./demand_response_event')(sequelize);
const EnergyConsumption = require('./energy_consumption')(sequelize);
const Alert = require('./alert')(sequelize);

module.exports = {
  sequelize,
  EnergyDevice,
  DeviceMetric,
  PredictiveMaintenance,
  DemandResponseEvent,
  EnergyConsumption,
  Alert
};