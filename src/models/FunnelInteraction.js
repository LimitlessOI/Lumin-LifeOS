```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');
const Funnel = require('./Funnel');
const User = require('./User');

class FunnelInteraction extends Model {}

FunnelInteraction.init({
    interaction_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    metadata: {
        type: DataTypes.JSONB
    }
}, {
    sequelize,
    modelName: 'FunnelInteraction',
    tableName: 'funnel_interactions',
    timestamps: false
});

FunnelInteraction.belongsTo(Funnel, { foreignKey: 'funnel_id', onDelete: 'CASCADE' });
FunnelInteraction.belongsTo(User, { foreignKey: 'user_id', onDelete: 'SET NULL' });

module.exports = FunnelInteraction;
```