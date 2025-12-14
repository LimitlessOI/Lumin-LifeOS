```javascript
const { validateSubmission } = require('../validators/submission');

test('validateSubmission should pass with valid data', () => {
    const req = { body: { name: 'Test Project', repository_url: 'http://example.com/repo.git' } };
    const res = {};
    const next = jest.fn();

    validateSubmission[2](req, res, next);
    expect(next).toHaveBeenCalled();
});

test('validateSubmission should fail with invalid URL', () => {
    const req = { body: { name: 'Test Project', repository_url: 'invalid-url' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateSubmission[2](req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
});
```