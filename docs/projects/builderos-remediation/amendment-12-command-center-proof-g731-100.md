// src/services/commandCenter/CommandCenterClient.js
import fetch from 'node-fetch'; // Assuming node-fetch or similar is available for HTTP requests

/**
 * @typedef {Object} AgentRegistrationPayload
 * @property {string} agentId - Unique identifier for the agent.
 * @property {string} name - Display name of the agent.
 *