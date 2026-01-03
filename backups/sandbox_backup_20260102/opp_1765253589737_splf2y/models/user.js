const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    username: DataTypes.STRING,
    email: DataTypes.TEXT
  });
  
  return User;
};