import OpenAI from 'openai';

// True when OpenAI rejected the previous_response_id itself (400 with
// param "previous_response_id"): code "previous_response_not_found" for an
// expired/unknown id, "invalid_value" for a malformed one.
//
// Kept separate from llm/client.ts so it can be used (and tested) without
// constructing the OpenAI client.
export function isInvalidPreviousResponseError(error: unknown): boolean {
   return (
      error instanceof OpenAI.APIError &&
      error.status === 400 &&
      error.param === 'previous_response_id'
   );
}
