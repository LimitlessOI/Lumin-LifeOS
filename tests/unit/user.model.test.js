const { userValidationRules } = require('../../src/modules/users/user.model');
const { validationResult } = require('express-validator');
const { mockRequest, mockResponse } = require('jest-mock-req-res');

describe('User Model Validation', () => {
  it('should validate correct email and password', async () => {
    const req = mockRequest({
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
    const res = mockResponse();

    await Promise.all(userValidationRules().map(validation => validation.run(req)));

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });

  it('should invalidate incorrect email', async () => {
    const req = mockRequest({
      body: {
        email: 'invalid-email',
        password: 'password123'
      }
    });
    const res = mockResponse();

    await Promise.all(userValidationRules().map(validation => validation.run(req)));

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(false);
  });
});