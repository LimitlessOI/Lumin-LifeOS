const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define("EducationalContent", {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    scenario_id: DataTypes.INTEGER,
    lesson_name: DataTypes.STRING(100),
    content: DataTypes.TEXT(), // Storing the educational material here; consider storing in a blob or file storage system for large files if necessary.
    createdAt: { type: DataTypes.DATE }, 
    updatedAt: { type: DataTypes.DATE }
  });
};