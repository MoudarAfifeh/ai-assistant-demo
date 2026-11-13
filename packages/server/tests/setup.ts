import { mock } from 'bun:test';

// Preloaded before every test file (see bunfig.toml).
//
// No test may reach a real external service:
// - Prisma is replaced by an in-memory stub (prisma.ts would otherwise
//   connect to DATABASE_URL).
// - OpenAI gets a dummy key and an unroutable base URL, so an accidentally
//   un-mocked call fails locally instead of hitting the API.
// - Ollama and Upstash are disabled, so the in-memory rate limiter is used.
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9/v1';
delete process.env.OLLAMA_HOST;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.VERCEL;

export const prismaMock = {
   product: { findUnique: mock(), findMany: mock() },
   review: { findMany: mock() },
   summary: { findFirst: mock(), upsert: mock() },
   conversation: { findUnique: mock(), upsert: mock() },
};

mock.module('../prisma', () => ({ prisma: prismaMock }));

export function resetPrismaMock() {
   for (const model of Object.values(prismaMock)) {
      for (const fn of Object.values(model)) fn.mockReset();
   }
}
