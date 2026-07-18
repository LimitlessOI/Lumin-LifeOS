/**
 * SYNOPSIS: Generates a motion video based on a text prompt using the Wan/Kling model on Replicate.
 */
import fetch from 'node-fetch';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

/**
 * Generates a motion video based on a text prompt using the Wan/Kling model on Replicate.
 * @param {string} prompt - The text prompt for generating the video.
 * @returns {Promise<string>} - A promise that resolves to the URL of the generated video.
 */
export async function generateMotionVideo(prompt) {
    if (!REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN is not set');
    }

    const response = await fetch(REPLICATE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: 'wan-kling',
            input: { prompt }
        })
    });

    if (!response.ok) {
        const errorDetails = await response.json();
        throw new Error(`Failed to create prediction: ${errorDetails.detail}`);
    }

    const prediction = await response.json();
    return prediction.output;
}
