// voice-input.js

class VoiceInput {
  constructor() {
    this.isListening = false;
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      console.log('Transcript:', transcript);
      this.sendToWhisperAPI(transcript);
    };
  }

  startListening() {
    this.isListening = true;
    this.recognition.start();
  }

  stopListening() {
    this.isListening = false;
    this.recognition.stop();
  }

  async sendToWhisperAPI(transcript) {
    const response = await fetch('https://api.whisper.ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: transcript })
    });
    const data = await response.json();
    console.log('Transcription from Whisper:', data);
  }
}

export default new VoiceInput();