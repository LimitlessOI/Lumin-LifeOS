const validateEnv = require('../src/config/validator');

describe('Environment Validation', () => {
    it('should validate environment variables without throwing an error', () => {
        expect(() => validateEnv()).not.toThrow();
    });

    it('should throw an error if required variables are missing', () => {
        delete process.env.DB_HOST;
        expect(() => validateEnv()).toThrow();
    });
});