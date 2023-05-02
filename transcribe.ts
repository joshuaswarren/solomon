import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
const { Configuration, OpenAIApi } = require("openai");


// Define the podcast feed URL and the output directory
const outputDir = 'transcripts';


// Define a helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
    return filename.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').substring(0, 64);
}

// Transcribe audio
async function transcribeAudio(filename: string, apiKey: string, ffmpegPath?: string) {
    const compressedFilename = path.join(path.dirname(filename), 'compressed_' + path.basename(filename));
    const configuration = new Configuration({
        apiKey: apiKey,
    });
    const openai = new OpenAIApi(configuration);
    var fileToProcess = null;
    if (ffmpegPath === undefined) {
        fileToProcess = filename;
    } else {
        await compressAudio(filename, compressedFilename, ffmpegPath);
        fileToProcess = compressedFilename;
    }

    const transcript = await openai.createTranscription(
        fs.createReadStream(fileToProcess),
        'whisper-1'
    );

    // Delete the compressed file
    fs.unlinkSync(compressedFilename);

    return transcript.data.text;
}

// Compress audio to fit within the 10MB limit
function compressAudio(inputFile: string, outputFile: string, ffmpegPath?: string): Promise<void> {
    // Ensure FFmpeg is installed on your system and provide the path to the FFmpeg executable
    // ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .audioBitrate('32k') // Adjust the bitrate as needed to achieve desired quality and size
            .output(outputFile)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

// Define the main async function to transcribe the latest episode of the podcast
export async function transcribeLatestEpisode(podcastFeedUrl: string, apiKey: string, ffmpegPath?: string): Promise<string> {
    // Fetch the podcast feed and extract the latest episode URL and title
    const feedResponse = await fetch(podcastFeedUrl, { mode: 'no-cors' });
    const feedText = await feedResponse.text();
    const episodeUrlRegex = /<enclosure url="([^"]+)"/g;
    const titleRegex = /<itunes:title>([^<]+)<\/itunes:title>/g;
    const episodeUrls: string[] = [];
    const episodeTitles: string[] = [];
    let match;
    while ((match = episodeUrlRegex.exec(feedText)) !== null) {
        episodeUrls.push(match[1]);
    }
    while ((match = titleRegex.exec(feedText)) !== null) {
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

    const transcriptText = await transcribeAudio(tempFilePath, apiKey, ffmpegPath);

// Save the transcript to a file in the output directory
    const transcriptFilename = sanitizeFilename(latestEpisodeTitle).replace(/\s+/g, '_'); // Replace spaces with underscores
    const transcriptFilePath = path.join(outputDir, `${transcriptFilename}.txt`);
    fs.writeFileSync(transcriptFilePath, transcriptText);

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    console.log(`Transcript saved to ${transcriptFilePath}`);
    return transcriptFilePath;
}

// Define the main async function to transcribe the latest episode of the podcast
export async function transcribeLatestEpisodeNoFiles(podcastFeedUrl: string, apiKey: string, ffmpegPath?: string): Promise<string> {
    // Fetch the podcast feed and extract the latest episode URL and title
    const feedResponse = await fetch(podcastFeedUrl, { mode: 'no-cors' });
    const feedText = await feedResponse.text();
    const episodeUrlRegex = /<enclosure url="([^"]+)"/g;
    const titleRegex = /<itunes:title>([^<]+)<\/itunes:title>/g;
    const episodeUrls: string[] = [];
    const episodeTitles: string[] = [];
    let match;
    while ((match = episodeUrlRegex.exec(feedText)) !== null) {
        episodeUrls.push(match[1]);
    }
    while ((match = titleRegex.exec(feedText)) !== null) {
        episodeTitles.push(match[1]);
    }
    const latestEpisodeUrl = episodeUrls[0];
    const latestEpisodeTitle = episodeTitles[0];

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

    const transcriptText = await transcribeAudio(tempFilePath, apiKey, ffmpegPath);

// Save the transcript to a file in the output directory
    fs.unlinkSync(tempFilePath);
    return transcriptText;
}
