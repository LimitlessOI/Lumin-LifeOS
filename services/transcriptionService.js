/**
 * Transcription Service — sends an audio file URL to OpenAI Whisper-1 for
 * speech-to-text transcription.
 *
 * Dependencies: openai (npm), ../config/config (openaiApiKey)
 * Exports: transcribeAudio(audioFileUrl)
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
const { Configuration, OpenAIApi } = require('openai');
const config = require('../config/config');

const openai = new OpenAIApi(new Configuration({
  apiKey: config.openaiApiKey,
}));

exports.transcribeAudio = async (audioFileUrl) => {
  try {
    const response = await openai.createTranscription({
      file: audioFileUrl,
      model: 'whisper-1',
    });
    return response.data.text;
  } catch (error) {
    throw new Error('Transcription failed');
  }
};