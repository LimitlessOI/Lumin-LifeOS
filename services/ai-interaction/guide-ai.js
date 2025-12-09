const axios = require('axios');

async function interactWithGuide(userInput) {
  try {
    const response = await axios.post('https://api.openai.com/v1/engines/gpt-4/completions', {
      prompt: userInput,
      max_tokens: 150,
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.data.choices[0].text;
  } catch (error) {
    console.error('AI interaction error:', error);
    throw new Error('Failed to get AI response');
  }
}

module.exports = { interactWithGuide };