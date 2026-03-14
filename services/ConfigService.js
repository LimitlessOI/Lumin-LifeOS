/**
 * Config Service — thin wrapper around env-validator that provides typed access
 * to validated environment variables, throwing on unknown keys.
 *
 * Dependencies: ../config/env-validator
 * Exports: ConfigService (class, default export)
 */
import envVars from '../config/env-validator.js';

class ConfigService {
  static get(key) {
    if (!(key in envVars)) {
      throw new Error(`Configuration key ${key} not found`);
    }
    return envVars[key];
  }
}

export default ConfigService;
