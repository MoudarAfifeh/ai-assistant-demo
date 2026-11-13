import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { chatController } from '../controllers/chat.controller';
import { chatService } from '../services/chat.service';
import { fakeRequest, fakeResponse } from './helpers';

const VALID_ID = '3c05a941-5825-4d2a-9a9c-bf4abc3a5b6d';

describe('chatController.sendMessage (Zod validation)', () => {
   afterEach(() => {
      mock.restore();
   });

   test.each([
      // No object at all: Zod reports a root-level error, not per-field ones.
      ['missing body', undefined, []],
      ['empty prompt', { prompt: '', conversationId: VALID_ID }, ['prompt']],
      [
         'whitespace-only prompt',
         { prompt: '   ', conversationId: VALID_ID },
         ['prompt'],
      ],
      [
         'prompt over 1000 characters',
         { prompt: 'a'.repeat(1001), conversationId: VALID_ID },
         ['prompt'],
      ],
      ['missing conversationId', { prompt: 'Hi' }, ['conversationId']],
      [
         'non-UUID conversationId',
         { prompt: 'Hi', conversationId: 'abc' },
         ['conversationId'],
      ],
   ])('%s: 400 with the Zod error tree', async (_label, body, fields) => {
      const sendMessage = spyOn(chatService, 'sendMessage');
      const res = fakeResponse();

      await chatController.sendMessage(fakeRequest({ body }), res);

      expect(res.statusCode).toBe(400);
      const tree = res.body as { properties?: Record<string, unknown> };
      for (const field of fields) {
         expect(tree.properties?.[field]).toBeDefined();
      }
      expect(sendMessage).not.toHaveBeenCalled();
   });

   test('accepts exactly 1000 characters', async () => {
      spyOn(chatService, 'sendMessage').mockResolvedValue({
         id: 'resp_1',
         message: 'ok',
      });
      const res = fakeResponse();

      await chatController.sendMessage(
         fakeRequest({
            body: { prompt: 'a'.repeat(1000), conversationId: VALID_ID },
         }),
         res
      );

      expect(res.statusCode).toBe(200);
   });

   test('valid request: calls the service with the trimmed (validated) prompt', async () => {
      const sendMessage = spyOn(chatService, 'sendMessage').mockResolvedValue({
         id: 'resp_1',
         message: 'A child ticket is $109.',
      });
      const res = fakeResponse();

      await chatController.sendMessage(
         fakeRequest({
            body: { prompt: '  How much?  ', conversationId: VALID_ID },
         }),
         res
      );

      expect(sendMessage).toHaveBeenCalledWith('How much?', VALID_ID);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: 'A child ticket is $109.' });
   });

   test('service failure: 500 with a generic error', async () => {
      spyOn(chatService, 'sendMessage').mockRejectedValue(new Error('boom'));
      const res = fakeResponse();

      await chatController.sendMessage(
         fakeRequest({ body: { prompt: 'Hi', conversationId: VALID_ID } }),
         res
      );

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to generate a response.' });
   });
});
