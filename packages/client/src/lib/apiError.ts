import axios from 'axios';

export type ApiErrorInfo = {
   message: string;
   isRateLimited: boolean;
};

// For a 429, use the server's message (it says how long to wait);
// for anything else, keep the caller's generic fallback text.
export function getApiError(error: unknown, fallback: string): ApiErrorInfo {
   if (axios.isAxiosError(error) && error.response?.status === 429) {
      const data = error.response.data as { error?: unknown } | undefined;
      return {
         message:
            typeof data?.error === 'string'
               ? data.error
               : 'Too many requests. Please try again later.',
         isRateLimited: true,
      };
   }
   return { message: fallback, isRateLimited: false };
}
