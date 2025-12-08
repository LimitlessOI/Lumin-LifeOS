```javascript
const profileService = require('../services/travel/profileService');
const db = require('../models'); // Sequelize models setup for test
jest.mock('../models');

describe('Profile Service', () => {
  it('should create a user profile', async () => {
    const mockProfile = { user_id: '123', preferences: {} };
    db.user_profiles.create.mockResolvedValue(mockProfile);

    const profile = await profileService.createUserProfile('123', {});
    expect(profile).toEqual(mockProfile);
  });

  it('should update a user profile', async () => {
    const mockProfile = { user_id: '123', preferences: { theme: 'dark' } };
    db.user_profiles.update.mockResolvedValue([1, [mockProfile]]);

    const profile = await profileService.updateUserProfile('123', { theme: 'dark' });
    expect(profile).toEqual(mockProfile);
  });
});
```