```javascript
const Recommendation = require('../models/Recommendation');
const RecommendationAttachment = require('../models/RecommendationAttachment');

exports.create = async (data) => {
    return Recommendation.create(data);
};

exports.findAll = async () => {
    return Recommendation.findAll({
        include: RecommendationAttachment
    });
};

exports.update = async (id, data) => {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recommendation not found');
    return recommendation.update(data);
};

exports.delete = async (id) => {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recommendation not found');
    return recommendation.destroy();
};
```