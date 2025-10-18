// sampleCalls.js
const openai = require('openai');
const analyzeTranscript = async (transcript) => {
    const response = await openai.Chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: transcript }],
    });
    return response.choices[0].message.content;
};

module.exports = { analyzeTranscript };