import express from 'express';
import axios from 'axios';
const router = express.Router();

router.post('/v1/chat/completions', async (req, res) => {
  const bearerToken = req.headers['authorization']?.split(' ')[1];
  if (!bearerToken) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  const body = req.body;
  try {
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', body, {
      headers: { Authorization: `Bearer ${bearerToken}` }
    });

    const openAIFormat = {
      id: ollamaResponse.data.id,
      object: 'chat.completion',
      created: new Date(),
      model: ollamaResponse.data.model,
      choices: ollamaResponse.data.choices.map(choice => ({
        index: choice.index,
        message: { role: choice.role, content: choice.content },
        finish_reason: choice.finish_reason
      }))
    };

    res.status(200).json(openAIFormat);
  } catch (error) {
    console.error('Error calling Ollama:', error);
    if (error.response) {
      return res.status(error.response.status || 500).json({ error: { message: error.message } });
    } else {
      return res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
});

export default router;