const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const VRDestination = sequelize.define('VRDestination', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
});

const VRSession = sequelize.define('VRSession', {
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE },
});

const VRAvatar = sequelize.define('VRAvatar', {
  avatarName: { type: DataTypes.STRING, allowNull: false },
  avatarData: { type: DataTypes.JSON },
});

const RealWorldSync = sequelize.define('RealWorldSync', {
  syncData: { type: DataTypes.JSON, allowNull: false },
});

VRSession.belongsTo(VRDestination);
VRAvatar.belongsTo(VRSession);

module.exports = { sequelize, VRDestination, VRSession, VRAvatar, RealWorldSync };