```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // Assuming sequelize instance is initialized in this file

class Recommendation extends Model {}

Recommendation.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    }
}, {
    sequelize,
    modelName: 'Recommendation',
    tableName: 'recommendations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Recommendation;
```