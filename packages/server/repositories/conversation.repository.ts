import { prisma } from '../prisma';

// Persists the last OpenAI response id per conversation, so chat memory
// survives restarts and is shared across serverless instances.
export const conversationRepository = {
   async getLastResponseId(
      conversationId: string
   ): Promise<string | undefined> {
      const conversation = await prisma.conversation.findUnique({
         where: { id: conversationId },
         select: { lastResponseId: true },
      });
      return conversation?.lastResponseId;
   },
   async setLastResponseId(conversationId: string, responseId: string) {
      await prisma.conversation.upsert({
         where: { id: conversationId },
         create: { id: conversationId, lastResponseId: responseId },
         update: { lastResponseId: responseId },
      });
   },
};
