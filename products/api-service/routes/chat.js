import express from 'express';
const router = express.Router();
import axios from 'axios';

router.post('/v1/chat/completions', async (req, res) => {
  try {
    // Extract Bearer token from Authorization header
    const token = req.header('Authorization').replace('Bearer ', '');
    
    // Accept body: { model, messages, temperature, max_tokens }
    const { model, messages, temperature, max_tokens } = req.body;
    
    // Call Ollama at http://localhost:11434/api/generate
    const response = await axios.post('http://localhost:11434/api/generate', {
      model,
      messages,
      temperature,
      max_tokens
    });
    
    // Convert Ollama response to OpenAI format with id, object, created, model, choices array
    const openaiResponse = {
      id: response.data.id,
      object: 'text_completion',
      created: response.data.created,
      model: response.data.model,
      choices: response.data.choices
    };
    
    res.json(openaiResponse);
  } catch (error) {
    // Handle errors with proper status codes
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Service unavailable' });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  }
});

export default router;