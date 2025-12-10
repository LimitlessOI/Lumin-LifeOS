```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Funnel = sequelize.define('Funnel', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
}, {
  timestamps: true,
});

module.exports = Funnel;
```