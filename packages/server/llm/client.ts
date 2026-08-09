import OpenAI from 'openai';
import { InferenceClient } from '@huggingface/inference';
import summarizePrompt from '../llm/prompts/summarize-reviews.txt';
import { Ollama } from 'ollama';

const inferenceClient = new InferenceClient(process.env.HF_TOKEN);

const openAiClient = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const ollamaClient = new Ollama();

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
   async summarizeReviews(reviews: string) {
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
   },
};
