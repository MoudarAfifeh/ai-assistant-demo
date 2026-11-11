import fs from 'fs';
import { coversationRepository } from '../repositories/conversation.repository';
import { llmClient } from '../llm/client';

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
      const response = await llmClient.generateText({
         model: 'gpt-4o-mini',
         instructions,
         prompt,
         temperature: 0.2,
         maxTokens: 200,
         previousResponseId:
            coversationRepository.getLastResponseId(conversationId),
      });
      coversationRepository.setLastResponseId(conversationId, response.id);

      return {
         id: response.id,
         message: response.text,
      };
   },
};
