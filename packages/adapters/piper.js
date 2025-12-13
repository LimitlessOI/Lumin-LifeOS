/**
 * Piper Adapter
 * Handles local Piper TTS (Text-to-Speech)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export class PiperAdapter {
  constructor(voice = 'en_US-lessac-medium', endpoint = 'local') {
    this.voice = voice;
    this.endpoint = endpoint;
    this.name = 'piper';
  }

  get capabilities() {
    return ['text_to_speech', 'voice_synthesis'];
  }

  async isAvailable() {
    try {
      await execAsync('which piper');
      return true;
    } catch (error) {
      return false;
    }
  }

  async synthesize(text, outputPath, options = {}) {
    const {
      voice = this.voice,
      speed = 1.0,
    } = options;

    try {
      // Use piper CLI (adjust command based on your installation)
      const command = `echo "${text}" | piper --model ${voice} --output_file "${outputPath}" --length_scale ${speed}`;
      
      await execAsync(command);

      if (!fs.existsSync(outputPath)) {
        throw new Error('Piper did not generate output file');
      }

      return {
        audioPath: outputPath,
        duration: await this.getAudioDuration(outputPath),
      };
    } catch (error) {
      throw new Error(`Piper synthesis failed: ${error.message}`);
    }
  }

  async getAudioDuration(audioPath) {
    // Use ffprobe or similar to get duration
    try {
      const { stdout } = await execAsync(`ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
      return parseFloat(stdout.trim());
    } catch (error) {
      return 0;
    }
  }

  getCostEstimate(textLength) {
    // Piper is free (local)
    return 0;
  }
}

export default PiperAdapter;
