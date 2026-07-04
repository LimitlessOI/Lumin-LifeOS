/**
 * SYNOPSIS: Exports createTranscriptionService — services/word-keeper-transcription.js.
 */
export function createTranscriptionService({ callCouncilMember }) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  async function transcribeAudio(audioInput, options = {}) {
    const taskType = 'transcription';
    const payload = audioInput && typeof audioInput === 'object' && !Array.isArray(audioInput)
      ? audioInput
      : { audio: audioInput };

    const result = await callCouncilMember('whisper', payload, {
      taskType,
      ...options,
    });

    if (typeof result === 'string') return result;
    if (result && typeof result === 'object') {
      if (typeof result.text === 'string') return result.text;
      if (typeof result.transcript === 'string') return result.transcript;
      if (typeof result.output_text === 'string') return result.output_text;
    }

    return result;
  }

  return {
    transcribeAudio,
  };
}