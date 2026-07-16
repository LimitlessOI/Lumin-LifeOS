/**
 * SYNOPSIS: js — backups/sandbox_backup_20260102/opp_1765253589737_splf2y/models/workflow.js.
 */
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