import * as fs from 'fs';
import { transcribeLatestEpisode } from './transcribe';
import { generateTakeaway } from './takeaway';

async function main() {
    const personalInfo = fs.readFileSync('personal-info.txt', 'utf-8').trim();
    const podcastFeedUrl = 'https://feeds.feedburner.com/ChaseOaksChurch';

    // Check if the episode has been transcribed before
    const transcriptFilePath = await transcribeLatestEpisode(podcastFeedUrl);
    if (fs.existsSync(transcriptFilePath)) {
        const transcript = fs.readFileSync(transcriptFilePath, 'utf-8');
        const takeaway = await generateTakeaway(transcript, personalInfo);
        console.log(`Takeaway: ${takeaway}`);
    } else {
        console.log('Episode already transcribed. Skipping transcription.');
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
