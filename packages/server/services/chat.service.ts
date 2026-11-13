import fs from 'fs';
import { conversationRepository } from '../repositories/conversation.repository';
import { llmClient } from '../llm/client';
import { isInvalidPreviousResponseError } from '../llm/errors';

// Read prompts with fs + import.meta.url so this works on Bun locally and
// on Node.js (Vercel), and so Vercel's file tracing bundles these files.
const template = fs.readFileSync(
   new URL('../llm/prompts/chatbot.txt', import.meta.url),
   'utf-8'
);
const parkInfo = fs.readFileSync(
   new URL('../llm/prompts/WonderWorld.md', import.meta.url),
   'utf-8'
);

const instructions = template.replace('{{parkInfo}}', parkInfo);

type ChatResponse = {
   id: string;
   message: string;
};
// public interface
export const chatService = {
   async sendMessage(
      prompt: string,
      conversationId: string
   ): Promise<ChatResponse> {
      const generate = (previousResponseId?: string) =>
         llmClient.generateText({
            model: 'gpt-4o-mini',
            instructions,
            prompt,
            temperature: 0.2,
            maxTokens: 200,
            previousResponseId,
         });

      const previousResponseId =
         await conversationRepository.getLastResponseId(conversationId);

      let response;
      try {
         response = await generate(previousResponseId);
      } catch (error) {
         if (!previousResponseId || !isInvalidPreviousResponseError(error)) {
            throw error;
         }
         // The stored response id expired or is unknown to OpenAI: start a
         // fresh thread once; the new id below replaces the stale one.
         console.warn(
            `Chat: previous_response_id rejected for conversation ${conversationId}; starting a new thread.`
         );
         response = await generate();
      }

      await conversationRepository.setLastResponseId(
         conversationId,
         response.id
      );

      return {
         id: response.id,
         message: response.text,
      };
   },
};
