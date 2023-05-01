import * as fs from 'fs';
import * as path from 'path';

// Load the OpenAI API key from a separate file
const apiKey = fs.readFileSync(path.join(__dirname, 'openai-key.txt'), 'utf-8').trim();
const personalInfo = fs.readFileSync(path.join(__dirname, 'personal-info.txt'), 'utf-8').trim();
const { OpenAI } = require("langchain/llms/openai");
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { loadSummarizationChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Define a function to read the transcript from file
function readTranscript(): string {
    const filename = fs.readdirSync(path.join(__dirname, 'transcripts')).pop();
    const filepath = path.join(__dirname, 'transcripts', filename);
    const transcript = fs.readFileSync(filepath, 'utf-8');
    return transcript;
}

// Define a function to generate a takeaway from the transcript using GPT
export async function generateTakeaway(transcript: string, personalInfo: string, apiKey: string): Promise<string> {
    const summarizeModel = new OpenAI({ temperature: 0, modelName: "gpt-3.5-turbo", openAIApiKey: apiKey  });
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 700 });
    const docs = await textSplitter.createDocuments([transcript]);

    // This convenience function creates a document chain prompted to summarize a set of documents.
    const summarizeChain = loadSummarizationChain(summarizeModel);
    const summarizeRes = await summarizeChain.call({
        input_documents: docs,
    });
    const summary = summarizeRes.text;

    const template = "Personalize and distill the wisdom from this talk into one or two sentences phrases as 'I will' such as 'I will be a kinder person'. Don't reference the speaker or this prompt. When replying, don't repeat my prompt and you do not have to name specific pieces of personal information about me unless you feel it is necessary for me to understand your answer.\nApply the following information about me when determining which parts of this wisdom to highlight and how to apply it: {personalInfo}\n\n Talk summary: {summary}";
    const prompt = new PromptTemplate({
        template: template,
        inputVariables: ["summary", "personalInfo"],
    });
    const model = new OpenAI({ temperature: 0.9, modelName: "gpt-3.5-turbo", openAIApiKey: apiKey });
    const chain = new LLMChain({ llm: model, prompt: prompt });
    const res = await chain.call({ summary: summary, personalInfo: personalInfo });
    return res.text;
}

