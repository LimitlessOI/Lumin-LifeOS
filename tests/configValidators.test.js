const { validateEnvVars } = require('../src/config/validators');

describe('Environment Variable Validators', () => {
  it('should validate environment variables without errors', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'user';
    process.env.DB_PASS = 'password';
    process.env.DB_NAME = 'dbname';
    process.env.STRIPE_API_KEY = 'test_key';
    process.env.REDIS_HOST = 'localhost';

    expect(() => validateEnvVars()).not.toThrow();
  });

  it('should throw an error for missing required variables', () => {
    delete process.env.DB_HOST;

    expect(() => validateEnvVars()).toThrow('Config validation error:');
  });
});