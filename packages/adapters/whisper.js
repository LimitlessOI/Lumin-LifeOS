/**
 * Whisper Adapter
 * Handles local Whisper STT (Speech-to-Text)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export class WhisperAdapter {
  constructor(model = 'large-v3-turbo', endpoint = 'local') {
    this.model = model;
    this.endpoint = endpoint;
    this.name = 'whisper';
  }

  get capabilities() {
    return ['speech_to_text', 'transcription'];
  }

  async isAvailable() {
    try {
      // Check if whisper.cpp or whisper is installed
      await execAsync('which whisper');
      return true;
    } catch (error) {
      // Try whisper.cpp
      try {
        await execAsync('which whisper-cli');
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  async transcribe(audioPath, options = {}) {
    const {
      language = 'en',
      task = 'transcribe',
      temperature = 0,
    } = options;

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    try {
      // Use whisper CLI (adjust command based on your installation)
      const command = `whisper "${audioPath}" --model ${this.model} --language ${language} --task ${task} --temperature ${temperature} --output_format json`;
      
      const { stdout } = await execAsync(command);
      const result = JSON.parse(stdout);

      return {
        text: result.text || '',
        segments: result.segments || [],
        language: result.language || language,
      };
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  getCostEstimate(audioDurationSeconds) {
    // Whisper is free (local)
    return 0;
  }
}

export default WhisperAdapter;
