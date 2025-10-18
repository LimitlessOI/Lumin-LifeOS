// coachingTips.js
module.exports.getTips = (analysis) => {
    const tips = [];
    if (analysis.objections.length > 0) {
        tips.push('Address objections regarding ' + analysis.objections.join(', '));
    }
    if (analysis.tone === 'negative') {
        tips.push('Try to maintain a positive tone throughout the call.');
    }
    return tips;
};