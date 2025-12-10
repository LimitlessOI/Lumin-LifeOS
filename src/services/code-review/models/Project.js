```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../../../db/sequelize');

const Project = sequelize.define('Project', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    repository_url: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'code_review_projects'
});

module.exports = Project;
```