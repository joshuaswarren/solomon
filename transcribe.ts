import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
const { Configuration, OpenAIApi } = require("openai");
// Load the OpenAI API key from a separate file
const apiKey = fs.readFileSync('openai-key.txt', 'utf-8').trim();
const configuration = new Configuration({
    apiKey: apiKey,
});
const openai = new OpenAIApi(configuration);

// Define the podcast feed URL and the output directory
const podcastFeedUrl = 'https://feeds.feedburner.com/ChaseOaksChurch';
const outputDir = 'transcripts';


// Define a helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
    return filename.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').substring(0, 32);
}

// Transcribe audio
async function transcribeAudio(filename: string) {
    const transcript = await openai.createTranscription(
        fs.createReadStream(filename),
        "whisper-1"
    );
    return transcript.data.text;
}

// Define the main async function to transcribe the latest episode of the podcast
export async function transcribeLatestEpisode(podcastFeedUrl: string): Promise<string> {
    // Fetch the podcast feed and extract the latest episode URL and title
    const feedResponse = await axios.get(podcastFeedUrl);
    const episodeUrlRegex = /<enclosure url="([^"]+)"/g;
    const titleRegex = /<title>([^<]+)<\/title>/g;
    const episodeUrls: string[] = [];
    const episodeTitles: string[] = [];
    let match;
    while ((match = episodeUrlRegex.exec(feedResponse.data)) !== null) {
        episodeUrls.push(match[1]);
    }
    while ((match = titleRegex.exec(feedResponse.data)) !== null) {
        episodeTitles.push(match[1]);
    }
    const latestEpisodeUrl = episodeUrls[0];
    const latestEpisodeTitle = episodeTitles[0];

    // Create the output directory if it doesn't exist yet
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Download the latest episode audio to a temporary file
    const audioResponse = await axios.get(latestEpisodeUrl, {
        responseType: 'stream',
    });
    const tempFilePath = path.join(outputDir, 'temp.mp3');
    audioResponse.data.pipe(fs.createWriteStream(tempFilePath));
    await new Promise<void>((resolve, reject) => {
        audioResponse.data.on('end', resolve);
        audioResponse.data.on('error', reject);
    });

    const transcriptText = await transcribeAudio(tempFilePath);

// Save the transcript to a file in the output directory
    const transcriptFilename = sanitizeFilename(latestEpisodeTitle).replace(/\s+/g, '_'); // Replace spaces with underscores
    const transcriptFilePath = path.join(outputDir, `${transcriptFilename}.txt`);
    fs.writeFileSync(transcriptFilePath, transcriptText);

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    console.log(`Transcript saved to ${transcriptFilePath}`);
    return transcriptFilePath;
}

