const { getUserById } = require('../../users/userRepository');

class UserIntegration {
    async fetchUserDetails(userId) {
        try {
            const user = await getUserById(userId);
            return user;
        } catch (error) {
            console.error(`Error fetching user: ${error.message}`);
        }
    }
}

module.exports = new UserIntegration();
//