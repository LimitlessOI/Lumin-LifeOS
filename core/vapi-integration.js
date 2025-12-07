/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    VAPI PHONE SYSTEM INTEGRATION                                   ║
 * ║                    Complete Vapi integration for phone calls                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class VapiIntegration {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.apiKey = process.env.VAPI_API_KEY;
    this.assistantId = process.env.VAPI_ASSISTANT_ID;
    this.baseUrl = 'https://api.vapi.ai';
  }

  /**
   * Initialize Vapi client
   */
  async initialize() {
    if (!this.apiKey) {
      console.warn('⚠️ [VAPI] API key not found. Set VAPI_API_KEY environment variable.');
      return false;
    }

    if (!this.assistantId) {
      console.warn('⚠️ [VAPI] Assistant ID not found. Set VAPI_ASSISTANT_ID environment variable.');
      return false;
    }

    console.log('✅ [VAPI] Integration initialized');
    return true;
  }

  /**
   * Make a phone call using Vapi
   */
  async makeCall({
    to,
    from = null,
    message = null,
    aiMember = 'chatgpt',
    variables = {},
  }) {
    if (!this.apiKey || !this.assistantId) {
      throw new Error('Vapi not configured. Set VAPI_API_KEY and VAPI_ASSISTANT_ID');
    }

    try {
      // Generate call message if not provided
      let callMessage = message;
      if (!callMessage) {
        const prompt = `Generate a professional phone call script for calling ${to}. 
        Purpose: Introduce LifeOS and its capabilities.
        Keep it under 30 seconds.`;
        
        callMessage = await this.callCouncilMember(aiMember, prompt, {
          useTwoTier: false,
          maxTokens: 200,
        });
      }

      // Create call via Vapi API
      const response = await fetch(`${this.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: this.assistantId,
          phoneNumberId: from, // Your Vapi phone number ID
          customer: {
            number: to,
          },
          variables: {
            message: callMessage,
            ...variables,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vapi API error: ${error}`);
      }

      const callData = await response.json();

      // Log call
      await this.logCall(callData);

      return callData;
    } catch (error) {
      console.error('❌ [VAPI] Call error:', error.message);
      throw error;
    }
  }

  /**
   * Handle webhook from Vapi
   */
  async handleWebhook(event, data) {
    try {
      switch (event) {
        case 'call-ended':
          await this.handleCallEnded(data);
          break;
        case 'call-started':
          await this.handleCallStarted(data);
          break;
        case 'function-call':
          await this.handleFunctionCall(data);
          break;
        default:
          console.log(`[VAPI] Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      console.error(`❌ [VAPI] Webhook error:`, error.message);
    }
  }

  /**
   * Handle call ended
   */
  async handleCallEnded(callData) {
    await this.pool.query(
      `INSERT INTO vapi_calls (call_id, phone_number, duration, status, transcript, recording_url, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (call_id) DO UPDATE SET 
         duration = $3, status = $4, transcript = $5, recording_url = $6, ended_at = NOW()`,
      [
        callData.id,
        callData.customer?.number,
        callData.duration,
        callData.status,
        callData.transcript,
        callData.recordingUrl,
      ]
    );

    console.log(`📞 [VAPI] Call ended: ${callData.id}`);
  }

  /**
   * Handle call started
   */
  async handleCallStarted(callData) {
    await this.pool.query(
      `INSERT INTO vapi_calls (call_id, phone_number, status, started_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (call_id) DO UPDATE SET status = $3, started_at = NOW()`,
      [
        callData.id,
        callData.customer?.number,
        'in-progress',
      ]
    );

    console.log(`📞 [VAPI] Call started: ${callData.id}`);
  }

  /**
   * Handle function call during conversation
   */
  async handleFunctionCall(functionData) {
    // Handle custom functions called during the call
    console.log(`🔧 [VAPI] Function called: ${functionData.name}`);
  }

  /**
   * Log call to database
   */
  async logCall(callData) {
    try {
      await this.pool.query(
        `INSERT INTO vapi_calls (call_id, phone_number, status, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (call_id) DO NOTHING`,
        [
          callData.id || callData.callId,
          callData.customer?.number || callData.phoneNumber,
          callData.status || 'initiated',
        ]
      );
    } catch (error) {
      console.error('Error logging call:', error.message);
    }
  }

  /**
   * Get call history
   */
  async getCallHistory(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM vapi_calls 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting call history:', error.message);
      return [];
    }
  }
}
