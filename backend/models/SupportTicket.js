```javascript
'use strict';
module.exports = (sequelize, DataTypes) => {
  const SupportTicket = sequelize.define('SupportTicket', {
    userId: DataTypes.INTEGER,
    ticketDetails: DataTypes.JSON,
    status: DataTypes.STRING
  }, {});
  SupportTicket.associate = function(models) {
    // associations can be defined here
  };
  return SupportTicket;
};
```