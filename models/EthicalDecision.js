```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class EthicalDecision extends Model {}

EthicalDecision.init({
    decisionText: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'EthicalDecision',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
});

module.exports = EthicalDecision;
```