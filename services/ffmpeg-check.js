/**
 * SYNOPSIS: Exports checkFFmpeg — services/ffmpeg-check.js.
 */
import { exec } from 'child_process';

export function checkFFmpeg() {
  return new Promise((resolve, reject) => {
    exec('ffmpeg -version', (error, stdout, stderr) => {
      if (error || stderr) {
        reject(new Error('FFmpeg is not available'));
      } else {
        resolve('FFmpeg is available');
      }
    });
  });
}