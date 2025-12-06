/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    WHITE-LABEL CONFIGURATION SYSTEM                              ║
 * ║                    Hide all internal logic from clients                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class WhiteLabelConfig {
  constructor(pool) {
    this.pool = pool;
    this.configs = new Map();
  }

  /**
   * Get white-label config for client
   */
  async getConfig(clientId) {
    if (this.configs.has(clientId)) {
      return this.configs.get(clientId);
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM white_label_configs WHERE client_id = $1`,
        [clientId]
      );

      if (result.rows.length > 0) {
        const config = result.rows[0];
        this.configs.set(clientId, config);
        return config;
      }

      // Default config
      return this.getDefaultConfig();
    } catch (error) {
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      clientId: 'default',
      brandName: 'AI Efficiency Platform',
      hideTiers: true,
      hideModels: true,
      hideCosts: true,
      hideArchitecture: true,
      customDomain: null,
      customLogo: null,
      apiResponseFormat: 'standard', // standard, minimal, custom
    };
  }

  /**
   * Sanitize response to hide internal details
   */
  sanitizeResponse(response, clientId, originalResponse) {
    const config = this.configs.get(clientId) || this.getDefaultConfig();

    // Remove internal details
    const sanitized = { ...response };

    if (config.hideTiers) {
      delete sanitized.tier;
      delete sanitized.path;
    }

    if (config.hideModels) {
      delete sanitized.model;
      delete sanitized.members;
    }

    if (config.hideCosts) {
      delete sanitized.cost;
      delete sanitized.tokens;
      delete sanitized.savings;
    }

    if (config.hideArchitecture) {
      delete sanitized.escalated;
      delete sanitized.validated;
      delete sanitized.corrected;
    }

    // Format response based on config
    if (config.apiResponseFormat === 'minimal') {
      return {
        success: sanitized.success,
        result: sanitized.result,
        message: sanitized.message || 'Task completed',
      };
    }

    return sanitized;
  }

  /**
   * Create client configuration
   */
  async createConfig(clientData) {
    const {
      clientId,
      brandName,
      hideTiers = true,
      hideModels = true,
      hideCosts = true,
      hideArchitecture = true,
      customDomain = null,
      customLogo = null,
      apiResponseFormat = 'standard',
    } = clientData;

    try {
      await this.pool.query(
        `INSERT INTO white_label_configs 
         (client_id, brand_name, hide_tiers, hide_models, hide_costs, hide_architecture, 
          custom_domain, custom_logo, api_response_format, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           brand_name = $2,
           hide_tiers = $3,
           hide_models = $4,
           hide_costs = $5,
           hide_architecture = $6,
           custom_domain = $7,
           custom_logo = $8,
           api_response_format = $9,
           updated_at = NOW()`,
        [clientId, brandName, hideTiers, hideModels, hideCosts, hideArchitecture, 
         customDomain, customLogo, apiResponseFormat]
      );

      const config = {
        clientId,
        brandName,
        hideTiers,
        hideModels,
        hideCosts,
        hideArchitecture,
        customDomain,
        customLogo,
        apiResponseFormat,
      };

      this.configs.set(clientId, config);
      return config;
    } catch (error) {
      throw new Error(`Failed to create white-label config: ${error.message}`);
    }
  }
}
