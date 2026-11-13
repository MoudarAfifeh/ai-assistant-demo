import {
   afterAll,
   beforeEach,
   describe,
   expect,
   setSystemTime,
   test,
} from 'bun:test';
import type { RequestHandler } from 'express';
import { chatRateLimit, summarizeRateLimit } from '../middleware/rateLimit';
import { fakeRequest, fakeResponse } from './helpers';

// Uses the in-memory limiter (setup.ts clears the Upstash variables).
// Limiter state is module-level, so every test jumps the clock forward by
// several days: all windows (max 1 day) are then empty again.
let clock = new Date('2026-01-01T00:00:00Z').getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;

function advance(ms: number) {
   clock += ms;
   setSystemTime(new Date(clock));
}

async function hit(limiter: RequestHandler, ip: string) {
   const res = fakeResponse();
   let passed = false;
   await limiter(fakeRequest({ ip }), res, () => {
      passed = true;
   });
   return { passed, res };
}

describe('rate limiting (in-memory)', () => {
   beforeEach(() => advance(3 * 24 * 60 * MINUTE));
   afterAll(() => setSystemTime());

   test('chat: 10 per minute per IP, then 429 with body and headers', async () => {
      for (let i = 0; i < 10; i++) {
         expect((await hit(chatRateLimit, '1.1.1.1')).passed).toBe(true);
      }
      const { passed, res } = await hit(chatRateLimit, '1.1.1.1');

      expect(passed).toBe(false);
      expect(res.statusCode).toBe(429);
      expect(res.body).toEqual({
         error: 'Too many requests. Please try again in 1 minute.',
         retryAfter: 60,
      });
      expect(res.headers).toEqual({
         'Retry-After': '60',
         'RateLimit-Limit': '10',
         'RateLimit-Remaining': '0',
         'RateLimit-Reset': '60',
      });

      // Other IPs are unaffected; the same IP recovers after the window.
      expect((await hit(chatRateLimit, '2.2.2.2')).passed).toBe(true);
      advance(MINUTE + SECOND);
      expect((await hit(chatRateLimit, '1.1.1.1')).passed).toBe(true);
   });

   test('chat: 50 per day per IP', async () => {
      for (let i = 0; i < 50; i++) {
         advance(61 * SECOND); // stay under the per-minute limit
         expect((await hit(chatRateLimit, '3.3.3.3')).passed).toBe(true);
      }
      advance(61 * SECOND);
      const { passed, res } = await hit(chatRateLimit, '3.3.3.3');

      expect(passed).toBe(false);
      expect(res.headers['RateLimit-Limit']).toBe('50');
      expect((res.body as { error: string }).error).toMatch(/hours?\.$/);
   });

   test('blocked requests do not count toward longer windows', async () => {
      // 10 allowed + 20 blocked in the first minute ...
      for (let i = 0; i < 30; i++) await hit(chatRateLimit, '4.4.4.4');
      // ... so 40 more requests still fit in the daily limit of 50.
      for (let i = 0; i < 40; i++) {
         advance(61 * SECOND);
         expect((await hit(chatRateLimit, '4.4.4.4')).passed).toBe(true);
      }
      advance(61 * SECOND);
      expect((await hit(chatRateLimit, '4.4.4.4')).passed).toBe(false);
   });

   test('chat: global cap of 500 per day across all IPs', async () => {
      for (let i = 0; i < 500; i++) {
         advance(SECOND);
         const ip = `10.0.${Math.floor(i / 5)}.${i % 5}`; // 5 requests per IP
         expect((await hit(chatRateLimit, ip)).passed).toBe(true);
      }
      const { passed, res } = await hit(chatRateLimit, '10.99.99.99');

      expect(passed).toBe(false);
      expect(res.statusCode).toBe(429);
      expect((res.body as { error: string }).error).toBe(
         'The demo has reached its daily chat limit. Please try again tomorrow.'
      );
   });

   test('summarize: 5 per 10 minutes per IP', async () => {
      for (let i = 0; i < 5; i++) {
         expect((await hit(summarizeRateLimit, '5.5.5.5')).passed).toBe(true);
      }
      const { passed, res } = await hit(summarizeRateLimit, '5.5.5.5');

      expect(passed).toBe(false);
      expect(res.body).toEqual({
         error: 'Too many requests. Please try again in 10 minutes.',
         retryAfter: 600,
      });

      advance(10 * MINUTE + SECOND);
      expect((await hit(summarizeRateLimit, '5.5.5.5')).passed).toBe(true);
   });
});
