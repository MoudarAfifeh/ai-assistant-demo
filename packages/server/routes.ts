import express from 'express';
import type { Request, Response } from 'express';
import { chatController } from './controllers/chat.controller';
import { reviewController } from './controllers/review.controller';
import { chatRateLimit, summarizeRateLimit } from './middleware/rateLimit';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
   res.send('Hello world!');
});
router.get('/api/hello', (req: Request, res: Response) => {
   res.json({
      message: 'Hello world!',
   });
});
router.post('/api/chat', chatRateLimit, chatController.sendMessage);

router.get('/api/products', reviewController.getProducts);

router.get('/api/products/:id/reviews', reviewController.getReviews);

router.post(
   '/api/products/:id/reviews/summarize',
   summarizeRateLimit,
   reviewController.summarizeReviews
);

export default router;
