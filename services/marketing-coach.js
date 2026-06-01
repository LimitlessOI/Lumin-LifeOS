/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
// Import AI Council service (assumed to exist and export generateCompletion)
// This dependency is from Task 5, AI council VERIFIED.
import * as aiCouncil from './ai-council.js';

// Constants for defining the AI coach's role and detecting "hooks"
const COACHING_SYSTEM_PROMPT = `You are a helpful marketing coach. Your primary goal is to guide the user through marketing strategies, provide actionable advice, and identify clear opportunities for them to take the next step in their marketing journey. Keep responses concise, encouraging, and focused on practical application.`;
const HOOK_DETECTION_KEYWORDS = [
  'next step',
  'action item',
  'call to action',
  'let\'s do this',
  'implement this',
  'your turn',
  'what\'s next',
];

/**
 * Generates an AI-powered coaching response based on the user's input and the ongoing conversation history.
 * This function interacts with the AI Council to simulate a marketing coaching session.
 * @param {string} userId - The unique identifier for the user engaging in the coaching conversation.
 * @param {string} userMessage - The current message or query from the user.
 * @param {Array<{role: 'user' | 'assistant', content: string}>} [conversationHistory=[]] - An array of previous messages in the conversation,
 *   formatted as `{role: 'user' | 'assistant', content: string}`. Defaults to an empty array for new conversations.
 * @returns {Promise<{response: string, hookDetected: boolean}>} An object containing the AI's generated
 *   response and a boolean flag indicating if a "hook" (e.g., a call to action or next step) was detected in the response.
 */
export async function getCoachingResponse(userId, userMessage, conversationHistory = []) {
  // Construct the full messages array for the AI council, including the system prompt and history.
  const messages = [
    { role: 'system', content: COACHING_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let aiResponseContent = "I'm sorry, I couldn't generate a coaching response at this moment. Please try again.";
  let hookDetected = false;

  try {
    // Call the AI council service to get a completion.
    // Assumes aiCouncil.generateCompletion returns an object with a 'content' string property.
    const completion = await aiCouncil.generateCompletion(messages);

    if (completion && typeof completion.content === 'string' && completion.content.trim().length > 0) {
      aiResponseContent = completion.content.trim();
      // Check if the AI's response contains any of the predefined hook detection keywords.
      const lowerCaseResponse = aiResponseContent.toLowerCase();
      hookDetected = HOOK_DETECTION_KEYWORDS.some(keyword => lowerCaseResponse.includes(keyword));
    }
  } catch (error) {
    console.error(`[MarketingCoachService] Error generating coaching response for user ${userId}:`, error);
    // In case of an error, the fallback response is used, and hookDetected remains false.
  }

  return {
    response: aiResponseContent,
    hookDetected: hookDetected,
  };
}

/**
 * Initializes a new coaching conversation with a standard greeting from the AI coach.
 * This function provides a starting point for users to begin their marketing coaching journey.
 * @param {string} userId - The unique identifier for the user.
 * @returns {Promise<{response: string, hookDetected: boolean}>} An initial coaching response, typically without a hook.
 */
export async function initializeCoachingConversation(userId) {
  // For an initial greeting, we provide a predefined message.
  // This message is designed to invite interaction but not necessarily contain an immediate "hook".
  const initialGreeting = "Hello! I'm your dedicated marketing coach. How can I assist you with your marketing strategy or any specific challenges you're facing today?";

  // An initial greeting typically doesn't contain a "hook" for immediate action.
  return {
    response: initialGreeting,
    hookDetected: false,
  };
}