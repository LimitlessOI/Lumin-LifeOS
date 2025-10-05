// Crash visibility
process.on('uncaughtException', (err) => {
  console.error('FATAL uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('FATAL unhandledRejection:', err);
  process.exit(1);
});

const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 8080;

const COMMAND_KEY = process.env.COMMAND_CENTER
