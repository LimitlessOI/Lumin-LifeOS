```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class LessonProgress extends Model {}

LessonProgress.init({
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    lesson_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    progress_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize,
    modelName: 'LessonProgress',
    timestamps: true
});

LessonProgress.associate = models => {
    LessonProgress.belongsTo(models.Lesson, {
        foreignKey: 'lesson_id',
        as: 'lesson'
    });
};

module.exports = LessonProgress;
```