// src/marketingos/events/handlers/campaignConversionEventHandler.js
import { marketingEventRepository } from '../../data/marketingEventRepository.js';
import { logger } from '../../../utils/logger.js'; // Assuming a common logger utility

/**
 * Handles CampaignConversionEvent to persist conversion data.
 * @param {object} event - The CampaignConversionEvent object.
 * @param {string} event.type - The type of the event, expected to be 'CampaignConversionEvent'.
 * @param {object} event.payload - The payload containing conversion details.
 * @param {string} event.payload.conversionId - Unique identifier for the conversion.
 * @param {string} event.payload.campaignId - Identifier for the campaign.
 * @param {string} event.payload.timestamp - ISO string timestamp of the conversion.
 * @param {string} event.payload.source - Source of the conversion event (e.g., 'web', 'api').
 */
export