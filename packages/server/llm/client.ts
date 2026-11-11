import OpenAI from 'openai';
import { InferenceClient } from '@huggingface/inference';
import fs from 'fs';
import { Ollama } from 'ollama';

const summarizePrompt = fs.readFileSync(
   new URL('./prompts/summarize-reviews.txt', import.meta.url),
   'utf-8'
);

const inferenceClient = new InferenceClient(process.env.HF_TOKEN);

const openAiClient = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

// Only enabled when OLLAMA_HOST is set; see summarizeReviews().
const ollamaClient = process.env.OLLAMA_HOST
   ? new Ollama({ host: process.env.OLLAMA_HOST })
   : null;

type GenerateTextOptions = {
   model?: string;
   prompt: string;
   instructions?: string;
   temperature?: number;
   maxTokens: number;
   previousResponseId?: string;
};
type GenerateTextResult = {
   id: string;
   text: string;
};
export const llmClient = {
   async generateText({
      model = 'gpt-4.1',
      prompt,
      instructions,
      temperature = 0.2,
      maxTokens = 300,
      previousResponseId,
   }: GenerateTextOptions): Promise<GenerateTextResult> {
      const response = await openAiClient.responses.create({
         model,
         input: prompt,
         instructions,
         temperature,
         max_output_tokens: maxTokens,
         previous_response_id: previousResponseId,
      });
      return {
         id: response.id,
         text: response.output_text,
      };
   },
   // Uses Ollama when OLLAMA_HOST is set (e.g. http://127.0.0.1:11434 locally),
   // otherwise falls back to OpenAI so it works on Vercel with no Ollama.
   async summarizeReviews(reviews: string) {
      if (ollamaClient) {
         const response = await ollamaClient.chat({
            model: 'tinyllama',
            messages: [
               {
                  role: 'system',
                  content: summarizePrompt,
               },
               {
                  role: 'user',
                  content: reviews,
               },
            ],
         });
         return response.message.content || '';
      }

      const response = await this.generateText({
         model: 'gpt-4o-mini',
         instructions: summarizePrompt,
         prompt: reviews,
         maxTokens: 300,
      });
      return response.text;
   },
};
