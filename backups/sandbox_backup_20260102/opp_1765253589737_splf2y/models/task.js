const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Task = sequelize.define("Task", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING,
      defaultValue: "PENDING" // Assume we have 'PENDING', 'COMPLETED' and other possible states for tasks
    }
  });
  
  return Task;
};