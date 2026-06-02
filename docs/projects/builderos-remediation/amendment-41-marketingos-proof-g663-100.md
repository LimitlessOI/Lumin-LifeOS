// src/api/internal/marketingos/triggerCampaign.js
import { publishToMarketingOSQueue } from '../../../services/messageQueue.js';
import { hashUserId } from '../../../utils/userHasher.js'; // Assuming a utility for consistent hashing

/**
 * Handles the internal API request to trigger a MarketingOS campaign.
 * This endpoint is intended for internal Life