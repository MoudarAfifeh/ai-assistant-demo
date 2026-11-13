import {
   afterEach,
   beforeEach,
   describe,
   expect,
   setSystemTime,
   test,
} from 'bun:test';
import { reviewRepository } from '../repositories/review.repository';
import { prismaMock, resetPrismaMock } from './setup';

const NOW = new Date('2026-06-10T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

type SummaryRow = {
   productId: number;
   content: string;
   generatedAt: Date;
   expiresAt: Date;
};

// A tiny in-memory "summaries" table that honours the same where-clause
// shape the repository sends to Prisma, so expiry is tested end to end.
function useFakeSummaryTable() {
   const rows = new Map<number, SummaryRow>();
   prismaMock.summary.upsert.mockImplementation(
      async ({
         where,
         create,
      }: {
         where: { productId: number };
         create: SummaryRow;
      }) => {
         rows.set(where.productId, create);
         return create;
      }
   );
   prismaMock.summary.findFirst.mockImplementation(
      async ({
         where,
      }: {
         where: {
            AND: [{ productId: number }, { expiresAt: { gt: Date } }];
         };
      }) => {
         const [{ productId }, { expiresAt }] = where.AND;
         const row = rows.get(productId);
         return row && row.expiresAt > expiresAt.gt ? row : null;
      }
   );
   return rows;
}

describe('reviewRepository summary cache (7-day expiry)', () => {
   beforeEach(() => {
      resetPrismaMock();
      setSystemTime(NOW);
   });
   afterEach(() => {
      setSystemTime();
   });

   test('storeReviewSummary upserts with expiresAt exactly 7 days from now', async () => {
      const rows = useFakeSummaryTable();

      await reviewRepository.storeReviewSummary(1, 'Nice product');

      const row = rows.get(1)!;
      expect(row.content).toBe('Nice product');
      expect(row.generatedAt).toEqual(NOW);
      expect(row.expiresAt.getTime() - NOW.getTime()).toBe(7 * DAY_MS);
      expect(prismaMock.summary.upsert.mock.calls[0]![0].where).toEqual({
         productId: 1,
      });
   });

   test('getReviewSummary filters on expiresAt > now', async () => {
      prismaMock.summary.findFirst.mockResolvedValue(null);

      await reviewRepository.getReviewSummary(3);

      expect(prismaMock.summary.findFirst).toHaveBeenCalledWith({
         where: { AND: [{ productId: 3 }, { expiresAt: { gt: NOW } }] },
      });
   });

   test('cache hit before expiry, miss after 7 days, miss when never stored', async () => {
      useFakeSummaryTable();
      await reviewRepository.storeReviewSummary(1, 'Nice product');

      setSystemTime(new Date(NOW.getTime() + 6 * DAY_MS));
      expect(await reviewRepository.getReviewSummary(1)).toBe('Nice product');

      setSystemTime(new Date(NOW.getTime() + 7 * DAY_MS + 1));
      expect(await reviewRepository.getReviewSummary(1)).toBeNull();

      expect(await reviewRepository.getReviewSummary(2)).toBeNull();
   });
});
