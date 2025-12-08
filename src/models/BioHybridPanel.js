```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class BioHybridPanel extends Model {}

BioHybridPanel.init({
    panel_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    manufacture_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'BioHybridPanel',
    tableName: 'biohybrid_panels'
});

module.exports = BioHybridPanel;
```