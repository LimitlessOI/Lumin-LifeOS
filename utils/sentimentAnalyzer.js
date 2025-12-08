```javascript
function analyze(nlpResult) {
    if (!nlpResult || nlpResult.length === 0) {
        throw new Error('Invalid NLP result');
    }
    // Example: Simple sentiment extraction based on score
    const sentiment = nlpResult[0].label;
    return sentiment;
}

module.exports = { analyze };
```