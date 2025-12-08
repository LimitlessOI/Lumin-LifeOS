```javascript
const UserProfilingService = require('../src/services/commerce/UserProfilingService');
const { pool } = require('../src/config/dbConfig');

describe('UserProfilingService', () => {
  afterAll(() => {
    pool.end();
  });

  test('createUserProfile should insert a new profile', async () => {
    const userId = 'test-user-id';
    const preferences = { likes: ['technology', 'books'] };
    const profile = await UserProfilingService.createUserProfile(userId, preferences);
    expect(profile).toHaveProperty('user_id', userId);
  });
});
```