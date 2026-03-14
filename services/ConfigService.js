/**
 * Config Service — thin wrapper around env-validator that provides typed access
 * to validated environment variables, throwing on unknown keys.
 *
 * Dependencies: ../config/env-validator
 * Exports: ConfigService (class, default export via module.exports)
 */
const envVars = require('../config/env-validator');

class ConfigService {
  static get(key) {
    if (!(key in envVars)) {
      throw new Error(`Configuration key ${key} not found`);
    }
    return envVars[key];
  }
}

module.exports = ConfigService;