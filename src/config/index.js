const convict = require('convict');
const dotenv = require('dotenv');
dotenv.config();

const config = convict({
  env: {
    doc: "The application environment.",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV"
  },
  db: {
    host: {
      doc: "Database host name/IP",
      format: String,
      default: "localhost",
      env: "DB_HOST"
    },
    port: {
      doc: "Database port",
      format: "port",
      default: 5432,
      env: "DB_PORT"
    },
    user: {
      doc: "Database username",
      format: String,
      default: "",
      env: "DB_USER"
    },
    password: {
      doc: "Database password",
      format: String,
      default: "",
      env: "DB_PASS"
    },
    name: {
      doc: "Database name",
      format: String,
      default: "",
      env: "DB_NAME"
    }
  },
  stripe: {
    apiKey: {
      doc: "Stripe API key",
      format: String,
      default: "",
      env: "STRIPE_API_KEY"
    }
  },
  redis: {
    host: {
      doc: "Redis host",
      format: String,
      default: "localhost",
      env: "REDIS_HOST"
    },
    port: {
      doc: "Redis port",
      format: "port",
      default: 6379,
      env: "REDIS_PORT"
    }
  },
  logLevel: {
    doc: "Log level",
    format: ["info", "warn", "error"],
    default: "info",
    env: "LOG_LEVEL"
  }
});

config.validate({ allowed: 'strict' });

module.exports = config;