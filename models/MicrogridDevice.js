```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const MicrogridDevice = sequelize.define('MicrogridDevice', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING
    },
    location: {
        type: DataTypes.STRING
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'inactive'
    }
}, {
    tableName: 'microgrid_devices'
});

module.exports = MicrogridDevice;
```