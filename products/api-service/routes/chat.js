import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/v1/chat/completions', async (req, res) => {
    const bearerToken = req.headers.authorization;
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }

    const body = req.body;
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
        return res.status(400).json({ error: { message: "Bad Request" } });
    }

    try {
        const ollamaResponse = await axios.post('http://localhost:11434/api/generate', body, {
            headers: { Authorization: bearerToken }
        });

        const openAIFormat = {
            id: ollamaResponse.data.id,
            object: 'chat.completion',
            created: ollamaResponse.data.created_at,
            model: ollamaResponse.data.model,
            choices: ollamaResponse.data.results.map(result => ({
                message: { content: result.text },
                index: result.index,
                logprobs: null,
                finish_reason: result.finish_reason
            }))
        };

        res.status(200).json(openAIFormat);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        } else {
            return res.status(500).json({ error: { message: "Internal Server Error" } });
        }
    }
});

export default router;