const { body } = require('express-validator');

const userValidationRules = () => {
  return [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long')
  ];
};

module.exports = {
  userValidationRules
};