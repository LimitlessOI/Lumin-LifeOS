// Pattern Learner Service

const { OpenAI } = require('openai');
const digitalTwinService = require('./digital-twin');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeConversation(conversation) {
    const response = await openai.embeddings({
        input: conversation,
        model: 'text-embedding-ada-002'
    });
    const embedding = response.data[0].embedding;
    const patterns = extractPatterns(conversation);
    await digitalTwinService.storePattern(patterns);
    return embedding;
}

function extractPatterns(conversation) {
    // Placeholder for pattern extraction logic
    // This function would analyze the conversation and return the decision patterns
    return {
        type: 'decision',
        description: 'Analyzed decision-making from conversation',
        confidence: 0.85,
        examples: [conversation]
    };
}

module.exports = { analyzeConversation };