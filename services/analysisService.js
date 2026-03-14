/**
 * Analysis Service — sends call transcription text to GPT-4 for analysis and
 * extracts next-action items from the model response.
 *
 * Dependencies: openai (npm), ../config/config (openaiApiKey)
 * Exports: analyzeText(text), extractNextActions(analysis)
 */
import { Configuration, OpenAIApi } from 'openai';
import config from '../config/config.js';

const openai = new OpenAIApi(new Configuration({
  apiKey: config.openaiApiKey,
}));

export const analyzeText = async (text) => {
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

export const extractNextActions = (analysis) => {
  // Simple example of action extraction logic based on analysis
  return analysis.match(/action:\s*(.*)/i)?.[1]?.split(',') || [];
};
