```javascript
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Interaction = sequelize.define('Interaction', {
    userId: DataTypes.INTEGER,
    interactionDetails: DataTypes.JSON
  }, {});
  Interaction.associate = function(models) {
    // associations can be defined here
  };
  return Interaction;
};
```