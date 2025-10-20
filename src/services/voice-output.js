// voice-output.js

class VoiceOutput {
  constructor() {
    this.elevenLabsAPIKey = 'YOUR_ELEVENLABS_API_KEY';
  }

  async speak(text) {
    const response = await fetch('https://api.elevenlabs.io/speech/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.elevenLabsAPIKey}` },
      body: JSON.stringify({ text: text })
    });
    const audioData = await response.json();
    this.playAudio(audioData.audioUrl);
  }

  playAudio(url) {
    const audio = new Audio(url);
    audio.play();
  }
}

export default new VoiceOutput();