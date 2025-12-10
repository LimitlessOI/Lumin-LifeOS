const { Client } = require('pg');
const config = require('../config');

const client = new Client({
  host: config.get('db.host'),
  port: config.get('db.port'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.name')
});

client.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error', err.stack));

module.exports = client;