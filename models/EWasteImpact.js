```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');
const BiodegradableMaterial = require('./BiodegradableMaterial');

class EWasteImpact extends Model {}

EWasteImpact.init({
    impact_metrics: {
        type: DataTypes.JSONB
    }
}, {
    sequelize,
    modelName: 'EWasteImpact',
    timestamps: true
});

EWasteImpact.belongsTo(BiodegradableMaterial, { foreignKey: 'material_id' });

module.exports = EWasteImpact;
```