```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('emissions_monitoring', {
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
      co2_emissions: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('emissions_monitoring');
  }
};
```