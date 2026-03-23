import express from 'express';
const router = express.Router();

// Define the POST /v1/chat/completions endpoint
router.post('/v1/chat/completions', async (req, res) => {
  // Extract Bearer token from Authorization header
  const token = req.header('Authorization').replace('Bearer ', '');

  // Check if token is valid
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extract request body
  const { model, messages, temperature, max_tokens } = req.body;

  // Check if required fields are present
  if (!model || !messages || !temperature || !max_tokens) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Call Ollama API at http://localhost:11434/api/generate
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    // Convert Ollama response to OpenAI format
    const ollamaResponse = await response.json();
    const openaiResponse = {
      id: ollamaResponse.id,
      object: 'text_completion',
      created: ollamaResponse.created,
      model: ollamaResponse.model,
      choices: ollamaResponse.choices.map((choice) => ({
        text: choice.text,
        finish_reason: choice.finish_reason,
      })),
    };

    // Return OpenAI response
    res.json(openaiResponse);
  } catch (error) {
    // Handle errors with proper status codes
    if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Bad Gateway' });
    } else {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

export default router;