// models/db.js (Sequelize)
const { dbConfig } = require('../config'); // Contains DB connections settings for neonPostgresDB
module.exports = sequelize => {
    const Customer = sequelize.define('Customer', { /* columns definitions */ });
    return { Customer, Sequelize };
};