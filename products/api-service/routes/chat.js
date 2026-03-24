import express from 'express';
const router = express.Router();

// Extract Bearer token from Authorization header
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).send({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  // Verify token here (e.g., with OpenAI API)
  req.token = token;
  next();
};

// POST /v1/chat/completions endpoint
router.post('/v1/chat/completions', authenticate, async (req, res) => {
  try {
    // Extract request body
    const { model, messages, temperature, max_tokens } = req.body;

    // Call Ollama at http://localhost:11434/api/generate
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.token}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });

    // Convert Ollama response to OpenAI format
    const data = await response.json();
    const openaiResponse = {
      id: data.id,
      object: 'text_completion',
      generated_text: data.choices[0].text,
      created: data.created,
      model: data.model,
      choices: data.choices,
    };

    // Return response in OpenAI format
    res.send(openaiResponse);
  } catch (error) {
    // Handle errors with proper status codes
    if (error.status === 401) {
      res.status(401).send({ error: 'Unauthorized' });
    } else if (error.status === 500) {
      res.status(500).send({ error: 'Internal Server Error' });
    } else {
      res.status(500).send({ error: 'Unknown Error' });
    }
  }
});

// Export the router
export default router;