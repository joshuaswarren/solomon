# Solomon

## Purpose
Given a podcast feed URL, fetch the most recent episode, use OpenAI's Whisper API to transcribe the podcast.
Then use LangChain to summarize the transcript and then use OpenAI's GPT API to provide a key takeaway that you can apply in your life. 

Now also uses ffmpeg to compress the audio file as some podcasts upload files at too high a quality to fit in the call to Whisper.

## Use Cases
### Sermons
Originally created to take the weekly sermon podcasts from Chase Oaks Church and convert them into a single takeaway. 

### Leadership Podcasts
	

## Usage
- Create a file named openai-key.txt and paste your OpenAI API key into it. 

- Create a file named personal-info.txt and enter a description of yourself that you'd like GPT to use when tailoring the takeaways to you. 

- Edit fetchAndSummarize.ts and specify the RSS feed to the podcast in this constant: 
    const podcastFeedUrl = 'https://feeds.feedburner.com/ChaseOaksChurch';

- Edit transcribe.ts to point to your install of ffmpeg
	// Ensure FFmpeg is installed on your system and provide the path to the FFmpeg executable
	ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');


- Run npm install

- Run npm run fetchAndSummarize and you will receive a takeaway from the most recent podcast episode. 

OR

- Install the module podcast-takeaways from the NPM registry now that this module is published there. 

