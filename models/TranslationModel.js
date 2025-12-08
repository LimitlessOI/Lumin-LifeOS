```javascript
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const TranslationModel = sequelize.define('Translation', {
    source_language: {
        type: DataTypes.STRING,
        allowNull: false
    },
    target_language: {
        type: DataTypes.STRING,
        allowNull: false
    },
    original_text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    translated_text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    context: {
        type: DataTypes.JSONB
    }
}, {
    timestamps: true
});

module.exports = { TranslationModel };
```