import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
const { Configuration, OpenAIApi } = require("openai");
import { requestUrl } from 'obsidian';

const outputDir = 'transcripts';
const tempDir = os.tmpdir();

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

async function getLatestEpisodeInfo(podcastFeedUrl: string) {
    const feedResponse = await requestUrl({ url: podcastFeedUrl });
    const feedText = feedResponse.text;
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
    return { latestEpisodeUrl: episodeUrls[0], latestEpisodeTitle: episodeTitles[0] };
}

async function downloadAndTranscribeEpisode(latestEpisodeUrl: string, apiKey: string, ffmpegPath?: string) {
    const audioResponse = await requestUrl({ url: latestEpisodeUrl });
    const arrayBufferToStream = (buffer: ArrayBuffer) => {
        const readable = new Readable();
        readable._read = () => {};
        readable.push(Buffer.from(buffer));
        readable.push(null);
        return readable;
    };
    const tempFilePath = path.join(tempDir, 'temp.mp3');
    const audioStream = arrayBufferToStream(audioResponse.arrayBuffer);
    audioStream.pipe(fs.createWriteStream(tempFilePath));
    await new Promise<void>((resolve, reject) => {
        audioStream.on('end', resolve);
        audioStream.on('error', reject);
    });

    const transcriptText = await transcribeAudio(tempFilePath, apiKey, ffmpegPath);
    fs.unlinkSync(tempFilePath);

    return transcriptText;
}

export async function transcribeLatestEpisode(podcastFeedUrl: string, apiKey: string, ffmpegPath?: string): Promise<string> {
    const { latestEpisodeUrl, latestEpisodeTitle } = await getLatestEpisodeInfo(podcastFeedUrl);

    // Create the output directory if it doesn't exist yet
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const transcriptText = await downloadAndTranscribeEpisode(latestEpisodeUrl, apiKey, ffmpegPath);

    // Save the transcript to a file in the output directory
    const transcriptFilename = sanitizeFilename(latestEpisodeTitle).replace(/\s+/g, '_'); // Replace spaces with underscores
    const transcriptFilePath = path.join(outputDir, `${transcriptFilename}.txt`);
    fs.writeFileSync(transcriptFilePath, transcriptText);

    console.log(`Transcript saved to ${transcriptFilePath}`);
    return transcriptFilePath;
}

export async function transcribeLatestEpisodeNoFiles(podcastFeedUrl: string, apiKey: string, ffmpegPath?: string): Promise<string> {
    const { latestEpisodeUrl } = await getLatestEpisodeInfo(podcastFeedUrl);

    const transcriptText = await downloadAndTranscribeEpisode(latestEpisodeUrl, apiKey, ffmpegPath);
    return transcriptText;
}
