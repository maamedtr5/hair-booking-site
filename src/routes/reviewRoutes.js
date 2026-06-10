// src/routes/reviewRoutes.js
import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { 
  validateReviewCreate 
} from '../validators/reviewValidator.js';
import { authenticate } from '../auth/authMiddleware.js';

const router = express.Router();

//   Create review (requires validation + authentication)
router.post(
  '/',
  authenticate,
  validateReviewCreate,
  reviewController.createReview
);

//   Get single review
router.get('/:id', reviewController.getReview);

//   Get all reviews
router.get('/', reviewController.getReviews);

//   Update review (authenticated users only)
router.put(
  '/:id',
  authenticate,
  validateReviewCreate,   // reuse validation rules for update
  reviewController.updateReview
);

//   Delete review (authenticated users only)
router.delete(
  '/:id',
  authenticate,
  reviewController.deleteReview
);

export default router;
