import express from 'express';
const router = express.Router();

// Extract Bearer token from Authorization header
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).send({ error: 'Unauthorized' });
  } else {
    next();
  }
};

// POST /v1/chat/completions endpoint
router.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { model, messages, temperature, max_tokens } = req.body;

  try {
    // Call Ollama at http://localhost:11434/api/generate
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });

    // Convert Ollama response to OpenAI format
    const data = await response.json();
    const openaiResponse = {
      id: data.id,
      object: 'completion',
      created: data.created,
      model: data.model,
      choices: data.choices,
    };

    // Send response
    res.json(openaiResponse);
  } catch (error) {
    // Handle errors with proper status codes
    console.error(error);
    if (error.status === 500) {
      res.status(500).send({ error: 'Internal Server Error' });
    } else {
      res.status(error.status).send({ error: error.message });
    }
  }
});

// Export router
module.exports = router;