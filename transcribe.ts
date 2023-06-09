import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
const { Configuration, OpenAIApi } = require("openai");
import { requestUrl } from 'obsidian';
import FormData from 'form-data';

const outputDir = 'transcripts';
const tempDir = os.tmpdir();

// Define a helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
    return filename.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').substring(0, 64);
}

async function createTranscriptionWithObsidian(fileToProcess: string, apiKey: string) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(fileToProcess));

    // Get the boundary from the form-data object
    const boundary = formData.getBoundary();

    // Convert form-data stream to ArrayBuffer
    const bodyStream = new Readable().wrap(formData);
    const chunks = [];
    for await (const chunk of bodyStream) {
        chunks.push(chunk);
    }
    const body = new Uint8Array(Buffer.concat(chunks)).buffer;

    const response = await requestUrl({
        url: 'https://api.openai.com/v1/audio/transcriptions',
        method: 'POST',
        contentType: `multipart/form-data; boundary=${boundary}`,
        body: body,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });

    return JSON.parse(response.text).text;
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
        try {
            await compressAudio(filename, compressedFilename, ffmpegPath);
        } catch (err) {
            throw new Error(`Error compressing audio file: ${err}`);
        }
        fileToProcess = compressedFilename;
    }

    if (!fs.existsSync(fileToProcess)) {
        throw new Error(`The audio file '${fileToProcess}' does not exist.`);
    }

    // Log file details before transcription
    const stats = fs.statSync(fileToProcess);
    const fileSizeInBytes = stats.size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
    console.log(`Transcribing file '${fileToProcess}' with size: ${fileSizeInMegabytes.toFixed(2)} MB`);
    const fileExtension = path.extname(fileToProcess);
    console.log(`File extension: ${fileExtension}`);
    const transcript = await createTranscriptionWithObsidian(fileToProcess, apiKey);
    return transcript;
    /*

    try {
        const transcript = await openai.createTranscription(
            fs.createReadStream(fileToProcess),
            'whisper-1'
        );
        // Delete the compressed file
        fs.unlinkSync(compressedFilename);

        return transcript.data.text;
    } catch (error) {
        if (error.response) {
            console.log("Error response status:", error.response.status);
            console.log("Error response data:", error.response.data);
            if (error.response.headers) {
                console.log("Rate limit remaining:", error.response.headers["x-ratelimit-remaining"]);
                console.log("Rate limit reset:", error.response.headers["x-ratelimit-reset"]);
            }
        } else {
            console.log("Error:", error.message);
        }
        throw error;
    }
     */
}

// Compress audio to fit within the 10MB limit
function compressAudio(inputFile: string, outputFile: string, ffmpegPath?: string): Promise<void> {
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
