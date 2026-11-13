import {
   afterEach,
   beforeEach,
   describe,
   expect,
   mock,
   spyOn,
   test,
} from 'bun:test';
import { chatService } from '../services/chat.service';
import { conversationRepository } from '../repositories/conversation.repository';
import { llmClient } from '../llm/client';
import { openAiError } from './helpers';

const CONVERSATION_ID = '3c05a941-5825-4d2a-9a9c-bf4abc3a5b6d';

function setup(storedResponseId: string | undefined) {
   const getLastResponseId = spyOn(
      conversationRepository,
      'getLastResponseId'
   ).mockResolvedValue(storedResponseId);
   const setLastResponseId = spyOn(
      conversationRepository,
      'setLastResponseId'
   ).mockResolvedValue(undefined);
   const generateText = spyOn(llmClient, 'generateText');
   return { getLastResponseId, setLastResponseId, generateText };
}

describe('chatService.sendMessage', () => {
   let warn: ReturnType<typeof spyOn>;

   beforeEach(() => {
      warn = spyOn(console, 'warn').mockImplementation(() => {});
   });
   afterEach(() => {
      mock.restore();
   });

   test('first message: sends no previous_response_id and stores the new id', async () => {
      const { generateText, setLastResponseId } = setup(undefined);
      generateText.mockResolvedValue({ id: 'resp_1', text: 'Hello!' });

      const result = await chatService.sendMessage('Hi', CONVERSATION_ID);

      expect(result).toEqual({ id: 'resp_1', message: 'Hello!' });
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(generateText.mock.calls[0]![0].previousResponseId).toBeUndefined();
      expect(generateText.mock.calls[0]![0].prompt).toBe('Hi');
      expect(setLastResponseId).toHaveBeenCalledWith(CONVERSATION_ID, 'resp_1');
   });

   test('follow-up message: reuses the stored id and replaces it with the new one', async () => {
      const { generateText, getLastResponseId, setLastResponseId } =
         setup('resp_1');
      generateText.mockResolvedValue({ id: 'resp_2', text: '$327' });

      await chatService.sendMessage('And three of those?', CONVERSATION_ID);

      expect(getLastResponseId).toHaveBeenCalledWith(CONVERSATION_ID);
      expect(generateText.mock.calls[0]![0].previousResponseId).toBe('resp_1');
      expect(setLastResponseId).toHaveBeenCalledWith(CONVERSATION_ID, 'resp_2');
   });

   test('rejected previous_response_id: retries once without it, warns, and stores the new id', async () => {
      const { generateText, setLastResponseId } = setup('resp_expired');
      generateText
         .mockRejectedValueOnce(
            openAiError(400, {
               message: "Previous response with id 'resp_expired' not found.",
               param: 'previous_response_id',
               code: 'previous_response_not_found',
            })
         )
         .mockResolvedValueOnce({ id: 'resp_fresh', text: 'Opens at 9!' });

      const result = await chatService.sendMessage(
         'When do you open?',
         CONVERSATION_ID
      );

      expect(result.message).toBe('Opens at 9!');
      expect(generateText).toHaveBeenCalledTimes(2);
      expect(generateText.mock.calls[0]![0].previousResponseId).toBe(
         'resp_expired'
      );
      expect(generateText.mock.calls[1]![0].previousResponseId).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(setLastResponseId).toHaveBeenCalledWith(
         CONVERSATION_ID,
         'resp_fresh'
      );
   });

   test.each([
      [
         '400 on another parameter',
         openAiError(400, { message: 'Bad model', param: 'model' }),
      ],
      ['500 server error', openAiError(500, { message: 'Server error' })],
      ['network error', new Error('ECONNRESET')],
   ])(
      'other errors (%s): rethrown without retry, nothing stored',
      async (_label, error) => {
         const { generateText, setLastResponseId } = setup('resp_1');
         generateText.mockRejectedValue(error);

         await expect(
            chatService.sendMessage('Hi', CONVERSATION_ID)
         ).rejects.toBe(error);
         expect(generateText).toHaveBeenCalledTimes(1);
         expect(setLastResponseId).not.toHaveBeenCalled();
         expect(warn).not.toHaveBeenCalled();
      }
   );

   test('no stored id: even a previous_response_id error is rethrown without retry', async () => {
      const { generateText, setLastResponseId } = setup(undefined);
      const error = openAiError(400, {
         message: 'not found',
         param: 'previous_response_id',
         code: 'previous_response_not_found',
      });
      generateText.mockRejectedValue(error);

      await expect(chatService.sendMessage('Hi', CONVERSATION_ID)).rejects.toBe(
         error
      );
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(setLastResponseId).not.toHaveBeenCalled();
   });
});
