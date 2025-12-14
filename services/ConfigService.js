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