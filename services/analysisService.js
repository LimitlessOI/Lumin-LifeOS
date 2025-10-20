const { Configuration, OpenAIApi } = require('openai');
const config = require('../config/config');

const openai = new OpenAIApi(new Configuration({
  apiKey: config.openaiApiKey,
}));

exports.analyzeText = async (text) => {
  try {
    const response = await openai.createCompletion({
      model: 'gpt-4',
      prompt: `Analyze the following call transcription: ${text}`,
      max_tokens: 150,
    });
    return response.data.choices[0].text;
  } catch (error) {
    throw new Error('Analysis failed');
  }
};

exports.extractNextActions = (analysis) => {
  // Simple example of action extraction logic based on analysis
  return analysis.match(/action:\s*(.*)/i)?.[1]?.split(',') || [];
};