/**
 * SYNOPSIS: Exports createCrisisPlan — services/lifeos-crisis-protocol.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * Creates a new crisis plan.
 * @param {object} params - The parameters for creating the crisis plan.
 * @param {string} params.userId - The ID of the user.
 * @param {Array<object>} params.contacts - An array of contact objects, e.g., [{ name: 'John Doe', type: 'family', phone: '123-456-7890', riskSeverity: ['low', 'medium'] }].
 * @param {Array<string>} params.groundingTechniques - An array of grounding instruction strings.
 * @param {Array<string>} params.avoidLanguage - An array of words or phrases to avoid.
 * @param {boolean} params.consent - User's consent for the crisis plan.
 * @returns {object} The created crisis plan object.
 */
export function createCrisisPlan({ userId, contacts, groundingTechniques, avoidLanguage, consent }) {
  if (!userId) {
    throw new Error("User ID is required to create a crisis plan.");
  }
  if (!Array.isArray(contacts)) {
    throw new Error("Contacts must be an array.");
  }
  if (!Array.isArray(groundingTechniques)) {
    throw new Error("Grounding techniques must be an array.");
  }
  if (!Array.isArray(avoidLanguage)) {
    throw new Error("Avoid language must be an array.");
  }

  return {
    userId,
    contacts,
    groundingTechniques,
    avoidLanguage,
    consent: !!consent, // Ensure consent is a boolean
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifies if consent is present and not empty in the crisis plan.
 * @param {object} plan - The crisis plan object.
 * @returns {boolean} True if consent is present and not empty, false otherwise.
 */
export function verifyConsent(plan) {
  return plan && plan.consent === true;
}

/**
 * Returns a grounding instruction string chosen from plan.groundingTechniques based on state.
 * This implementation uses a simple round-robin approach for demonstration.
 * In a more complex scenario, 'state' and 'preferences' could influence the choice.
 * @param {string} state - The current emotional or mental state (e.g., 'anxious', 'overwhelmed').
 * @param {object} plan - The crisis plan object.
 * @param {object} preferences - User preferences for grounding techniques (not used in this simple implementation).
 * @returns {string} A grounding instruction string.
 */
export function getGroundingTechnique(state, plan, preferences = {}) {
  if (!plan || !Array.isArray(plan.groundingTechniques) || plan.groundingTechniques.length === 0) {
    return "Take a deep breath. Notice five things you can see, four things you can feel, three things you can hear, two things you can smell, and one thing you can taste.";
  }

  // Simple deterministic selection based on the length of the state string
  // This ensures a consistent but varied choice given the same state.
  const index = state.length % plan.groundingTechniques.length;
  return plan.groundingTechniques[index];
}

/**
 * Returns a filtered array of contacts from plan.contacts based on risk severity.
 * @param {string} risk - The current risk severity (e.g., 'low', 'medium', 'high').
 * @param {object} plan - The crisis plan object.
 * @returns {Array<object>} A filtered array of contact objects.
 */
export function getContactsForRisk(risk, plan) {
  if (!plan || !Array.isArray(plan.contacts)) {
    return [];
  }

  const normalizedRisk = risk.toLowerCase();
  return plan.contacts.filter(contact =>
    Array.isArray(contact.riskSeverity) && contact.riskSeverity.includes(normalizedRisk)
  );
}

/**
 * Returns a compassionate, transparent message that includes grounding instructions and contact options,
 * while avoiding plan.avoidLanguage words.
 * @param {string} risk - The current risk severity.
 * @param {object} plan - The crisis plan object.
 * @returns {string} A crisis message.
 */
export function renderCrisisMessage(risk, plan) {
  if (!plan) {
    return "It looks like your crisis plan is not available. Please reach out to a trusted person.";
  }

  const groundingInstruction = getGroundingTechnique(risk, plan);
  const contacts = getContactsForRisk(risk, plan);

  let message = `You are not alone. It looks like you are experiencing a ${risk} risk level.

Here is a grounding technique that may help:
"${groundingInstruction}"`;

  if (contacts.length > 0) {
    message += "\n\nPeople who care about you are here to support you. Consider reaching out to one of these contacts:";
    contacts.forEach(contact => {
      message += `\n- ${contact.name} (${contact.type}): ${contact.phone}`;
    });
  } else {
    message += "\n\nIt appears there are no specific contacts listed for this risk level in your plan. Please remember to reach out to any trusted person or emergency services if you need immediate assistance.";
  }

  // Apply avoid language filter
  let filteredMessage = message;
  if (Array.isArray(plan.avoidLanguage) && plan.avoidLanguage.length > 0) {
    plan.avoidLanguage.forEach(word => {
      // Create a regex for global, case-insensitive replacement
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredMessage = filteredMessage.replace(regex, '*****'); // Replace with asterisks
    });
  }

  return filteredMessage;
}

/**
 * Returns an updated plan object.
 * @param {object} plan - The original crisis plan object.
 * @param {object} update - An object containing fields to update.
 * @returns {object} The updated crisis plan object.
 */
export function updateCrisisPlan(plan, update) {
  if (!plan) {
    throw new Error("Cannot update a non-existent plan.");
  }
  if (typeof update !== 'object' || update === null) {
    throw new Error("Update must be an object.");
  }

  const updatedPlan = { ...plan };

  // Iterate over update keys and apply them,
  // with specific handling for arrays to ensure they are replaced, not merged.
  for (const key in update) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      // For arrays, replace the entire array
      if (Array.isArray(update[key])) {
        updatedPlan[key] = [...update[key]];
      } else if (key === 'consent') {
        updatedPlan[key] = !!update[key]; // Ensure consent is boolean
      } else {
        updatedPlan[key] = update[key];
      }
    }
  }

  return updatedPlan;
}