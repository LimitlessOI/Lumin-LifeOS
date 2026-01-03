const { Model } = require('sequelize');
module.exports = (sequelize) => {
  const FinanceRecord = sequelize.define("FinanceRecord", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    taskId: DataTypes.STRING, // Assuming this is the foreign key to tasks table
    amount: DataTypes.DECIMAL(10, 2),
    transactionDate: {
      type: DataTypes.DATEONLY
    }
  });
  
  return FinanceRecord;
};