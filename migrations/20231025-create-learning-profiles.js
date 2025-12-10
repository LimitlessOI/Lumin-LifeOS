```js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('learning_profiles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    // Similarly, create other tables (skill_verifications, learning_paths, peer_collaborations)
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('learning_profiles');
    // Similarly, drop other tables
  }
};
```