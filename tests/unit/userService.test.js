```javascript
const UserService = require('../../src/services/userService');
const UserRepository = require('../../src/repositories/userRepository');
const bcrypt = require('bcrypt');
jest.mock('../../src/repositories/userRepository');

describe('UserService', () => {
    it('should register a new user', async () => {
        const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
        UserRepository.createUser.mockResolvedValue(mockUser);

        const user = await UserService.registerUser('testuser', 'test@example.com', 'password123');
        expect(user).toEqual(mockUser);
    });

    it('should authenticate a user', async () => {
        const mockUser = { id: 1, email: 'test@example.com', password_hash: await bcrypt.hash('password123', 10) };
        UserRepository.getUserByEmail.mockResolvedValue(mockUser);

        const result = await UserService.authenticateUser('test@example.com', 'password123');
        expect(result).toHaveProperty('token');
    });
});
```