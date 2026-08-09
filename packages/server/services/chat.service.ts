import fs from 'fs';
import path from 'path';
import { coversationRepository } from '../repositories/conversation.repository';
import template from '../llm/prompts/chatbot.txt';
import { llmClient } from '../llm/client';

const parkInfo = fs.readFileSync(
   path.join(__dirname, '..', 'llm', 'prompts', 'WonderWorld.md'),
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
