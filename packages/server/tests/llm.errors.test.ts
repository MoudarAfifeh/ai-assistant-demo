import { describe, expect, test } from 'bun:test';
import { isInvalidPreviousResponseError } from '../llm/errors';
import { openAiError } from './helpers';

describe('isInvalidPreviousResponseError', () => {
   test('matches an expired/unknown previous_response_id (previous_response_not_found)', () => {
      const error = openAiError(400, {
         message: "Previous response with id 'resp_x' not found.",
         type: 'invalid_request_error',
         param: 'previous_response_id',
         code: 'previous_response_not_found',
      });
      expect(isInvalidPreviousResponseError(error)).toBe(true);
   });

   test('matches a malformed previous_response_id (invalid_value)', () => {
      const error = openAiError(400, {
         message: "Invalid 'previous_response_id'.",
         type: 'invalid_request_error',
         param: 'previous_response_id',
         code: 'invalid_value',
      });
      expect(isInvalidPreviousResponseError(error)).toBe(true);
   });

   test('does not match a 400 on another parameter', () => {
      const error = openAiError(400, {
         message: 'Invalid model.',
         param: 'model',
         code: 'invalid_value',
      });
      expect(isInvalidPreviousResponseError(error)).toBe(false);
   });

   test('does not match server errors or non-OpenAI errors', () => {
      expect(
         isInvalidPreviousResponseError(
            openAiError(500, { message: 'Server error' })
         )
      ).toBe(false);
      expect(isInvalidPreviousResponseError(new Error('boom'))).toBe(false);
      expect(isInvalidPreviousResponseError(undefined)).toBe(false);
   });
});
