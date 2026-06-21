/**
 * SYNOPSIS: js — tests/configLoader.test.js.
 */
const loadConfig = require('../src/config/loader');
const validateEnv = require('../src/config/validator');

describe('Configuration Loader', () => {
    it('should load and validate configuration successfully', async () => {
        await loadConfig();
        expect(() => validateEnv()).not.toThrow();
    });
});