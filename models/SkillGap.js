```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

class SkillGap extends Model {}

SkillGap.init({
    skillName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gapLevel: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'SkillGap',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
});

SkillGap.belongsTo(User, { foreignKey: 'userId' });

module.exports = SkillGap;
```