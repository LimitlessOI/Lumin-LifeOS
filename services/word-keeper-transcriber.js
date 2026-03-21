/**
 * services/word-keeper-transcriber.js — Amendment 16 (Word Keeper)
 *
 * Server-side audio transcription pipeline.
 * Receives audio blobs from the phone PWA, sends to OpenAI Whisper,
 * returns transcript. Used by the /transcript/audio endpoint.
 *
 * Falls back to mock transcript if Whisper unavailable (dev mode).
 *
 * Exports: createTranscriber(apiKey) → { transcribeBuffer, transcribeFormData }
 */

import { Readable } from 'stream';

export function createTranscriber(openAiApiKey) {
  const apiKey = openAiApiKey || process.env.OPENAI_API_KEY;

  /**
   * Transcribe a raw audio Buffer using OpenAI Whisper.
   * @param {Buffer} audioBuffer
   * @param {string} [mimeType]  — e.g. 'audio/webm', 'audio/mp4', 'audio/wav'
   * @param {string} [filename]  — hint for Whisper file extension
   * @returns {Promise<string>}  — transcript text
   */
  async function transcribeBuffer(audioBuffer, mimeType = 'audio/webm', filename = 'audio.webm') {
    if (!apiKey) {
      console.warn('[TRANSCRIBER] No OPENAI_API_KEY — returning empty transcript');
      return '';
    }

    if (!audioBuffer || audioBuffer.length < 1000) {
      // Too short to be real audio
      return '';
    }

    try {
      // Build FormData manually for Node.js (no browser FormData available)
      const boundary = `----WKFormBoundary${Date.now().toString(16)}`;
      const nl = '\r\n';

      const header =
        `--${boundary}${nl}` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"${nl}` +
        `Content-Type: ${mimeType}${nl}${nl}`;

      const modelPart =
        `${nl}--${boundary}${nl}` +
        `Content-Disposition: form-data; name="model"${nl}${nl}` +
        `whisper-1${nl}`;

      const langPart =
        `${nl}--${boundary}${nl}` +
        `Content-Disposition: form-data; name="language"${nl}${nl}` +
        `en${nl}`;

      const footer = `--${boundary}--${nl}`;

      const body = Buffer.concat([
        Buffer.from(header),
        audioBuffer,
        Buffer.from(modelPart + langPart + footer),
      ]);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Whisper API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return (data.text || '').trim();

    } catch (err) {
      console.error('[TRANSCRIBER] Whisper failed:', err.message);
      return '';
    }
  }

  /**
   * Transcribe from a multer-parsed file object.
   * @param {{ buffer: Buffer, mimetype: string, originalname: string }} file
   */
  async function transcribeFormData(file) {
    if (!file?.buffer) return '';
    return transcribeBuffer(file.buffer, file.mimetype || 'audio/webm', file.originalname || 'audio.webm');
  }

  return { transcribeBuffer, transcribeFormData };
}
