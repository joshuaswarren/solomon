import * as fs from 'fs';
import { transcribeLatestEpisode } from './transcribe';
import { generateTakeaway } from './takeaway';

export async function fetchAndSummarize(apiKey: string, personalInfo: string, podcastFeedUrl: string, ffmpegPath?: string): Promise<string> {
    const transcriptFilePath = await transcribeLatestEpisode(podcastFeedUrl, ffmpegPath);
    if (fs.existsSync(transcriptFilePath)) {
        const transcript = fs.readFileSync(transcriptFilePath, 'utf-8');
        const takeaway = await generateTakeaway(transcript, personalInfo, apiKey);
        return takeaway;
        console.log(`Takeaway: ${takeaway}`);
    } else {
        console.log('Episode already transcribed. Skipping transcription.');
        return null;
    }
}
