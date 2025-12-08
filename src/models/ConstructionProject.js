```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class ConstructionProject extends Model {}

ConstructionProject.init({
    project_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'ConstructionProject',
    tableName: 'construction_projects'
});

module.exports = ConstructionProject;
```