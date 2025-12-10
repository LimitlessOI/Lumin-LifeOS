```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../../../db/sequelize');
const Project = require('./Project');

const Analytics = sequelize.define('Analytics', {
    project_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Project,
            key: 'id'
        },
        allowNull: false
    },
    review_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_reviewed: {
        type: DataTypes.DATE
    }
}, {
    timestamps: true,
    tableName: 'code_review_analytics'
});

module.exports = Analytics;
```