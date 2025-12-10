```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const Sensor = sequelize.define('Sensor', {
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_reading: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
});

const SensorData = sequelize.define('SensorData', {
    sensor_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Sensor,
            key: 'id'
        }
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
});

const Drone = sequelize.define('Drone', {
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_communication: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
});

const DroneData = sequelize.define('DroneData', {
    drone_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Drone,
            key: 'id'
        }
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
});

module.exports = { Sensor, SensorData, Drone, DroneData };
```