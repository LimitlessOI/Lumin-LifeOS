const Joi = require('joi');

const envVarsSchema = Joi.object({
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  STRIPE_API_KEY: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  LOG_LEVEL: Joi.string().valid('info', 'warn', 'error').default('info')
});

module.exports = {
  validateEnvVars: () => {
    const { error } = envVarsSchema.validate(process.env, { allowUnknown: true });
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
  }
};