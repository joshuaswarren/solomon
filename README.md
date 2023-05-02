# Solomon, aka podcast-takeaways

## Purpose
Given a podcast feed URL, fetch the most recent episode, use OpenAI's Whisper API to transcribe the podcast.
Then use LangChain to summarize the transcript and then use OpenAI's GPT API to provide a key takeaway that you can apply in your life. 

Now also uses ffmpeg to compress the audio file as some podcasts upload files at too high a quality to fit in the call to Whisper.

## Use Cases
### Sermons
Originally created to take the weekly sermon podcasts from Chase Oaks Church and convert them into a single takeaway. 

### Leadership Podcasts
Additionally being used to generate takeaways from the Business Accelerator podcast. 	

## Usage
- Install the module podcast-takeaways from the NPM registry now that this module is published there. 
- See cli.ts for a usage example
- Run the command npm run cli for an example

