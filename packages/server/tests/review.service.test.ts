import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { reviewService } from '../services/review.service';
import { reviewRepository } from '../repositories/review.repository';
import { llmClient } from '../llm/client';

const reviews = [
   { content: 'Great sound.' },
   { content: 'Comfortable.' },
] as Awaited<ReturnType<typeof reviewRepository.getReviews>>;

describe('reviewService.summarizeReviews', () => {
   afterEach(() => {
      mock.restore();
   });

   test('cache hit: returns the stored summary without calling the LLM', async () => {
      spyOn(reviewRepository, 'getReviewSummary').mockResolvedValue(
         'Cached summary'
      );
      const getReviews = spyOn(reviewRepository, 'getReviews');
      const store = spyOn(reviewRepository, 'storeReviewSummary');
      const summarize = spyOn(llmClient, 'summarizeReviews');

      const summary = await reviewService.summarizeReviews(1);

      expect(summary).toBe('Cached summary');
      expect(getReviews).not.toHaveBeenCalled();
      expect(summarize).not.toHaveBeenCalled();
      expect(store).not.toHaveBeenCalled();
   });

   // The repository returns null both when no summary exists and when the
   // stored one has expired (see review.repository.test.ts).
   test('missing or expired: summarizes the 10 newest reviews and stores the result', async () => {
      spyOn(reviewRepository, 'getReviewSummary').mockResolvedValue(null);
      const getReviews = spyOn(
         reviewRepository,
         'getReviews'
      ).mockResolvedValue(reviews);
      const summarize = spyOn(llmClient, 'summarizeReviews').mockResolvedValue(
         'Fresh summary'
      );
      const store = spyOn(
         reviewRepository,
         'storeReviewSummary'
      ).mockResolvedValue({} as never);

      const summary = await reviewService.summarizeReviews(7);

      expect(summary).toBe('Fresh summary');
      expect(getReviews).toHaveBeenCalledWith(7, 10);
      expect(summarize).toHaveBeenCalledWith('Great sound.\n\nComfortable.');
      expect(store).toHaveBeenCalledWith(7, 'Fresh summary');
   });
});
