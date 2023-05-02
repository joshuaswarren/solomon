import { fetchAndSummarize } from './fetchAndSummarize';
import * as fs from 'fs';

const apiKeyPath = 'openai-key.txt';
const personalInfoPath = 'personal-info.txt';

const apiKey = fs.readFileSync(apiKeyPath, 'utf-8').trim();
const personalInfo = fs.readFileSync(personalInfoPath, 'utf-8').trim();

// Replace these values with your actual data or read them from a config file or environment variables
const podcastFeedUrl = 'https://feeds.feedburner.com/ChaseOaksChurch';
const ffmpegPath = '/opt/homebrew/bin/ffmpeg'; // Optional
const storeFiles = true; // Store files to the filesystem or not?

(async () => {
    try {
        const takeaway = await fetchAndSummarize(apiKey, personalInfo, podcastFeedUrl, storeFiles, ffmpegPath);
        console.log('Takeaway:', takeaway);
    } catch (error) {
        console.error('Error:', error);
    }
})();