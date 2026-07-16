/**
 * SYNOPSIS: Exports detectCrisisLanguage — services/lifeos-crisis-language-detector.js.
 */
import axios from 'axios';

const AMENDMENT_28_ENDPOINT = 'https://api.amendment28.com/detect';

export async function detectCrisisLanguage(userInput) {
    try {
        const response = await axios.post(AMENDMENT_28_ENDPOINT, { text: userInput });
        return response.data;
    } catch (error) {
        console.error('Error detecting crisis language:', error);
        throw new Error('Crisis language detection failed');
    }
}