```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);
const MicrogridDevice = require('./MicrogridDevice');

const EnergyTransaction = sequelize.define('EnergyTransaction', {
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'energy_transactions'
});

EnergyTransaction.belongsTo(MicrogridDevice, { foreignKey: 'device_id' });

module.exports = EnergyTransaction;
```