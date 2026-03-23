import express from 'express';
const router = express.Router();
const axios = require('axios');

router.post('/v1/chat/completions', async (req, res) => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader.match(/Bearer (.+)/)[1];

    // Extract body from request
    const body = req.body;
    const { model, messages, temperature, max_tokens } = body;

    // Call Ollama at http://localhost:11434/api/generate
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
      model,
      messages,
      temperature,
      max_tokens,
    });

    // Convert Ollama response to OpenAI format
    const openAIResponse = {
      id: ollamaResponse.data.id,
      object: 'text',
      created: ollamaResponse.data.created,
      model: ollamaResponse.data.model,
      choices: ollamaResponse.data.choices.map((choice) => ({
        text: choice.text,
        index: choice.index,
        logprobs: choice.logprobs,
        offset: choice.offset,
        length: choice.length,
        finish_reason: choice.finish_reason,
      })),
    };

    // Return OpenAI response
    res.json(openAIResponse);
  } catch (error) {
    // Handle errors with proper status codes
    if (error.response) {
      res.status(401).json({ error: 'Unauthorized' });
    } else if (error.request) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(500).json({ error: 'Unknown Error' });
    }
  }
});

export default router;