```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Customization extends Model {}

Customization.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    value: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    scenario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'scenarios',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'Customization',
    tableName: 'customizations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Customization;
```