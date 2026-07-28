/**
 * SYNOPSIS: Answers an incoming live phone call using Vapi for AI-powered conversation.
 */
import twilio from 'twilio';
import axios from 'axios';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Answers an incoming live phone call using Vapi for AI-powered conversation.
 * @param {object} callData - Incoming call details from Twilio webhook.
 * @returns {Promise<object>} TwiML response or Vapi session result.
 */
export async function answerLivePhone(callData) {
  try {
    const { CallSid, From, To } = callData;

    // Create a Vapi assistant session for this call
    const vapiResponse = await axios.post(
      `${VAPI_BASE_URL}/assistant`,
      {
        phoneCallProvider: 'twilio',
        phoneCallSid: CallSid,
        callerNumber: From,
        calledNumber: To,
        // Additional Vapi configuration can be added here
      },
      {
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Generate TwiML to bridge the call to Vapi's media stream
    const twiml = new twilio.twiml.VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
      url: `wss://api.vapi.ai/ws?assistantId=${vapiResponse.data.id}`,
    });

    return {
      twiml: twiml.toString(),
      vapiSessionId: vapiResponse.data.id,
    };
  } catch (error) {
    console.error('Error answering live phone:', error);
    throw error;
  }
}