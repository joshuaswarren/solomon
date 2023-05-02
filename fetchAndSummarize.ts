import * as fs from 'fs';
import {transcribeLatestEpisode, transcribeLatestEpisodeNoFiles} from './transcribe';
import { generateTakeaway } from './takeaway';

export async function fetchAndSummarize(apiKey: string, personalInfo: string, podcastFeedUrl: string, storeFiles: boolean, ffmpegPath?: string): Promise<string> {
    if (storeFiles === false ) {
      return fetchAndSummarizeNoFiles(apiKey, personalInfo, podcastFeedUrl, ffmpegPath);
    }
    const transcriptFilePath = await transcribeLatestEpisode(podcastFeedUrl, apiKey, ffmpegPath);
    if (fs.existsSync(transcriptFilePath)) {
        const transcript = fs.readFileSync(transcriptFilePath, 'utf-8');
        const takeaway = await generateTakeaway(transcript, personalInfo, apiKey);
        console.log(`Takeaway: ${takeaway}`);
        return takeaway;
    } else {
        console.log('Episode already transcribed. Skipping transcription.');
        return null;
    }
}

export async function fetchAndSummarizeNoFiles(apiKey: string, personalInfo: string, podcastFeedUrl: string, ffmpegPath?: string): Promise<string> {
    const transcript = await transcribeLatestEpisodeNoFiles(podcastFeedUrl, apiKey, ffmpegPath);
    const takeaway = await generateTakeaway(transcript, personalInfo, apiKey);
    return takeaway;
}
