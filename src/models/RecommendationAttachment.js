```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');
const Recommendation = require('./Recommendation');

class RecommendationAttachment extends Model {}

RecommendationAttachment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    recommendationId: {
        type: DataTypes.INTEGER,
        references: {
            model: Recommendation,
            key: 'id'
        }
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'RecommendationAttachment',
    tableName: 'recommendation_attachments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = RecommendationAttachment;
```