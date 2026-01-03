const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Workflow = sequelize.define("Workflow", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING
  });
  
  return Workflow;
};