import type { Request, Response } from 'express';
import OpenAI from 'openai';

// Minimal Express request/response doubles for controller and middleware tests.
export function fakeRequest(init: {
   body?: unknown;
   params?: Record<string, string>;
   ip?: string;
   headers?: Record<string, string>;
}): Request {
   return {
      body: init.body,
      params: init.params ?? {},
      ip: init.ip ?? '127.0.0.1',
      headers: init.headers ?? {},
   } as unknown as Request;
}

export type FakeResponse = Response & {
   statusCode: number;
   body: unknown;
   headers: Record<string, string>;
};

export function fakeResponse(): FakeResponse {
   const res = {
      statusCode: 200,
      body: undefined as unknown,
      headers: {} as Record<string, string>,
      status(code: number) {
         res.statusCode = code;
         return res;
      },
      json(body: unknown) {
         res.body = body;
         return res;
      },
      set(fields: Record<string, string>) {
         Object.assign(res.headers, fields);
         return res;
      },
   };
   return res as unknown as FakeResponse;
}

// Builds an error exactly the way the OpenAI SDK does for an HTTP error
// response ({ error: { message, type, param, code } }).
export function openAiError(
   status: number,
   error: { message: string; type?: string; param?: string; code?: string }
) {
   return OpenAI.APIError.generate(status, { error }, undefined, new Headers());
}
