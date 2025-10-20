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