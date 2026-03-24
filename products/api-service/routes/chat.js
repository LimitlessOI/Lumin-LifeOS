import express from 'express';
const router = express.Router();

const ollamaUrl = 'http://localhost:11434/api/generate';

router.post('/v1/chat/completions', async (req, res) => {
  const authHeader = req.header('Authorization');
  const token = authHeader.split(' ')[1];

  const body = req.body;
  const { model, messages, temperature, max_tokens } = body;

  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  if (!model || !messages || !temperature || !max_tokens) {
    return res.status(400).send({ error: 'Invalid request body' });
  }

  try {
    const response = await fetch(ollamaUrl, {
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

    const data = await response.json();
    const openaiResponse = {
      id: data.id,
      object: 'text_completion',
      created: data.created,
      model,
      choices: [
        {
          text: data.choices[0].text,
          index: 0,
          logprobs: null,
          finish_reason: data.choices[0].finish_reason,
        },
      ],
    };

    res.json(openaiResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

export default router;