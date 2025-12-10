```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FunnelEvent = sequelize.define('FunnelEvent', {
  funnelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  eventData: {
    type: DataTypes.JSON,
  },
}, {
  timestamps: true,
});

module.exports = FunnelEvent;
```