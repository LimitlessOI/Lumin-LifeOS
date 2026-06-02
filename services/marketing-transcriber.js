/**
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { finished } from 'node:stream/promises';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

// Assuming services/word-keeper-transcriber.js exports this function.
// The content of word-keeper-transcriber.js is not provided, but its existence and API are assumed based on its "VERIFIED" status.
// This import will resolve in the target execution environment where the dependency is available.
import { transcribeAudioFile } from './word-keeper-transcriber.js';

/**
 * Transcribes audio content from a given URL using the underlying word-keeper-transcriber service.
 * This function orchestrates fetching the audio from the provided URL, saving it to a temporary file,
 * invoking the transcription service, and finally cleaning up the temporary file.
 *
 * @param {string} audioUrl - The URL of the audio file to transcribe. Must be a valid, accessible URL.
 * @returns {Promise<string>} A promise that resolves with the transcribed text as a string.
 * @throws {Error} If the `audioUrl` is invalid, fetching the audio fails, writing to a temporary file fails,
 *                 or the underlying transcription service encounters an error.
 */
export async function transcribeAudioFromUrl(audioUrl) {
  let tempFilePath = null;
  try {
    // Validate the input URL
    if (!audioUrl || typeof audioUrl !== 'string') {
      throw new Error('Invalid audioUrl provided. Must be a non-empty string.');
    }
    // Perform a basic URL parsing check to ensure it's a well-formed URL
    new URL(audioUrl);

    // Generate a unique temporary file path for storing the downloaded audio
    const tempDir = os.tmpdir();
    const filename = `audio-${randomUUID()}.tmp`;
    tempFilePath = path.join(tempDir, filename);

    // Fetch the audio stream from the provided URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from ${audioUrl}: HTTP status ${response.status} - ${response.statusText}`);
    }

    // Create a write stream to the temporary file and pipe the audio response body into it
    const fileStream = fs.createWriteStream(tempFilePath);
    await finished(response.body.pipe(fileStream));

    // Invoke the word-keeper-transcriber service with the path to the temporary audio file
    const transcription = await transcribeAudioFile(tempFilePath);

    return transcription;
  } catch (error) {
    // Log the error for debugging and re-throw to propagate it upstream
    console.error(`Error during audio transcription from URL "${audioUrl}":`, error);
    throw error;
  } finally {
    // Ensure the temporary file is deleted, regardless of success or failure
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        // Log cleanup errors but do not re-throw, as the main operation might have succeeded
        console.warn(`Failed to delete temporary file "${tempFilePath}":`, cleanupError);
      }
    }
  }
}