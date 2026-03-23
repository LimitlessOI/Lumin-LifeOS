import express from 'express';
const router = express.Router();

// Extract Bearer token from Authorization header
const auth = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// POST /v1/chat/completions endpoint
router.post('/v1/chat/completions', auth, (req, res) => {
  try {
    // Extract request body
    const { model, messages, temperature, max_tokens } = req.body;

    // Call Ollama API
    const ollamaUrl = 'http://localhost:11434/api/generate';
    const ollamaOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    };
    fetch(ollamaUrl, ollamaOptions)
      .then((response) => response.json())
      .then((data) => {
        // Convert Ollama response to OpenAI format
        const openaiResponse = {
          id: data.id,
          object: 'chat.completion',
          created: data.created,
          model: 'davinci',
          choices: [
            {
              text: data.text,
              index: 0,
              finish_reason: data.finish_reason,
            },
          ],
        };
        res.json(openaiResponse);
      })
      .catch((error) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });
  } catch (error) {
    res.status(400).json({ error: 'Bad Request' });
  }
});

// Export Express router
export default router;