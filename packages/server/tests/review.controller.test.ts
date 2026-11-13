import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { reviewController } from '../controllers/review.controller';
import { productRepository } from '../repositories/product.repository';
import { reviewRepository } from '../repositories/review.repository';
import { reviewService } from '../services/review.service';
import { fakeRequest, fakeResponse } from './helpers';

const product = { id: 1, name: 'Headphones', description: null, price: 249.99 };
const review = {
   id: 1,
   author: 'Emily',
   rating: 5,
   content: 'Great',
   createdAt: new Date(),
   productId: 1,
};

describe('reviewController.summarizeReviews', () => {
   afterEach(() => {
      mock.restore();
   });

   test('404 when the product does not exist', async () => {
      spyOn(productRepository, 'getProduct').mockResolvedValue(null);
      const summarize = spyOn(reviewService, 'summarizeReviews');
      const res = fakeResponse();

      await reviewController.summarizeReviews(
         fakeRequest({ params: { id: '99999' } }),
         res
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Product does not exist.' });
      expect(summarize).not.toHaveBeenCalled();
   });

   test('400 for a non-numeric product id', async () => {
      const getProduct = spyOn(productRepository, 'getProduct');
      const res = fakeResponse();

      await reviewController.summarizeReviews(
         fakeRequest({ params: { id: 'abc' } }),
         res
      );

      expect(res.statusCode).toBe(400);
      expect(getProduct).not.toHaveBeenCalled();
   });

   test('400 when the product has no reviews', async () => {
      spyOn(productRepository, 'getProduct').mockResolvedValue(product);
      spyOn(reviewRepository, 'getReviews').mockResolvedValue([]);
      const summarize = spyOn(reviewService, 'summarizeReviews');
      const res = fakeResponse();

      await reviewController.summarizeReviews(
         fakeRequest({ params: { id: '1' } }),
         res
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'There are no reviews to summarize.' });
      expect(summarize).not.toHaveBeenCalled();
   });

   test('200 with the summary otherwise', async () => {
      spyOn(productRepository, 'getProduct').mockResolvedValue(product);
      spyOn(reviewRepository, 'getReviews').mockResolvedValue([review]);
      spyOn(reviewService, 'summarizeReviews').mockResolvedValue('Summary');
      const res = fakeResponse();

      await reviewController.summarizeReviews(
         fakeRequest({ params: { id: '1' } }),
         res
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ summary: 'Summary' });
   });
});
