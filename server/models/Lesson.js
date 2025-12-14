```javascript
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Lesson extends Model {}

Lesson.init({
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: DataTypes.TEXT,
    media_url: DataTypes.STRING
}, {
    sequelize,
    modelName: 'Lesson',
    timestamps: true
});

Lesson.associate = models => {
    Lesson.hasMany(models.LessonProgress, {
        foreignKey: 'lesson_id',
        as: 'progress'
    });
};

module.exports = Lesson;
```