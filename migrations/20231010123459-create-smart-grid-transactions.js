```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('smart_grid_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      unit_id: {
        type: Sequelize.INTEGER,
        references: { model: 'waste_to_energy_units', key: 'id' },
        allowNull: false
      },
      energy_transferred: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      transaction_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('smart_grid_transactions');
  }
};
```