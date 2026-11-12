import type { NextFunction, Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting for the endpoints that call paid LLMs.
//
// With Upstash credentials (UPSTASH_REDIS_REST_* or the KV_REST_API_* names
// set by Vercel's Upstash integration), counters live in Redis and are
// shared by every serverless instance. Without them, an in-memory sliding
// window is used instead: fine for local dev, but per-instance on Vercel.

type Window = { requests: number; seconds: number; label: string };

type LimitResult = {
   success: boolean;
   limit: number;
   remaining: number;
   reset: number; // unix ms
};

type Limiter = {
   limit(identifier: string): Promise<LimitResult>;
};

const redisUrl =
   process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
   process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis =
   redisUrl && redisToken
      ? new Redis({ url: redisUrl, token: redisToken })
      : null;

if (!redis) {
   const message =
      'Rate limiting: Upstash Redis is not configured; using an in-memory limiter.';
   if (process.env.VERCEL) {
      console.error(
         `${message} Limits are per serverless instance. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.`
      );
   } else {
      console.info(`${message} (fine for local development)`);
   }
}

// Sliding-window log kept in process memory (local dev fallback).
function createMemoryLimiter({ requests, seconds }: Window): Limiter {
   const hits = new Map<string, number[]>();
   const windowMs = seconds * 1000;
   return {
      async limit(identifier) {
         const now = Date.now();
         const recent = (hits.get(identifier) ?? []).filter(
            (t) => t > now - windowMs
         );
         const success = recent.length < requests;
         if (success) recent.push(now);
         hits.set(identifier, recent);
         return {
            success,
            limit: requests,
            remaining: Math.max(0, requests - recent.length),
            reset: (recent[0] ?? now) + windowMs,
         };
      },
   };
}

function createUpstashLimiter(redis: Redis, window: Window): Limiter {
   const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(window.requests, `${window.seconds} s`),
      prefix: `ratelimit:${window.label}`,
      // Fail open quickly if Upstash is slow; see the timeout check below.
      timeout: 1000,
   });
   return {
      async limit(identifier) {
         try {
            const result = await ratelimit.limit(identifier);
            if (result.reason === 'timeout') {
               console.warn(
                  `Rate limiting: Upstash timed out (${window.label}); allowing request.`
               );
            }
            return result;
         } catch (error) {
            console.warn(
               `Rate limiting: Upstash error (${window.label}); allowing request.`,
               error
            );
            return {
               success: true,
               limit: window.requests,
               remaining: window.requests,
               reset: Date.now(),
            };
         }
      },
   };
}

function createLimiter(window: Window): Limiter {
   return redis
      ? createUpstashLimiter(redis, window)
      : createMemoryLimiter(window);
}

// On Vercel, x-real-ip is set by the platform and can't be spoofed by the
// client. Locally, fall back to the socket address.
function getClientIp(req: Request): string {
   if (process.env.VERCEL) {
      const header = req.headers['x-real-ip'];
      const ip = Array.isArray(header) ? header[0] : header;
      if (ip) return ip;
   }
   return req.ip ?? 'unknown';
}

function formatWait(seconds: number): string {
   if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
   const minutes = Math.ceil(seconds / 60);
   if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
   const hours = Math.ceil(minutes / 60);
   return `${hours} hour${hours === 1 ? '' : 's'}`;
}

type Rule = {
   limiter: Limiter;
   scope: 'ip' | 'global';
   message?: string; // custom message (used for the global cap)
};

function rule(
   label: string,
   requests: number,
   seconds: number,
   scope: Rule['scope'] = 'ip',
   message?: string
): Rule {
   return {
      limiter: createLimiter({ requests, seconds, label }),
      scope,
      message,
   };
}

// Rules are checked in order and checking stops at the first one that
// blocks, so a request rejected by a short window doesn't use up the
// longer windows.
function rateLimit(rules: Rule[]) {
   return async (req: Request, res: Response, next: NextFunction) => {
      const ip = getClientIp(req);
      for (const { limiter, scope, message } of rules) {
         const result = await limiter.limit(scope === 'ip' ? ip : 'global');
         if (!result.success) {
            const retryAfter = Math.max(
               1,
               Math.ceil((result.reset - Date.now()) / 1000)
            );
            res.set({
               'Retry-After': String(retryAfter),
               'RateLimit-Limit': String(result.limit),
               'RateLimit-Remaining': String(result.remaining),
               'RateLimit-Reset': String(retryAfter),
            });
            res.status(429).json({
               error:
                  message ??
                  `Too many requests. Please try again in ${formatWait(retryAfter)}.`,
               retryAfter,
            });
            return;
         }
      }
      next();
   };
}

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

export const chatRateLimit = rateLimit([
   rule('chat:minute', 10, MINUTE),
   rule('chat:day', 50, DAY),
   rule(
      'chat:global-day',
      500,
      DAY,
      'global',
      'The demo has reached its daily chat limit. Please try again tomorrow.'
   ),
]);

export const summarizeRateLimit = rateLimit([
   rule('summarize:10min', 5, 10 * MINUTE),
]);
