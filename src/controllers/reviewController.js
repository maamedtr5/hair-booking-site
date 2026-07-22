// controllers/reviewController.js
import { prisma } from '../lib/prisma.js';
import reviewModel from '../models/review.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createReview = async (req, res) => {
  try {
    const review = await reviewModel.createReview(req.body);
    return sendSuccess(res, review, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getReview = async (req, res) => {
  try {
    const review = await reviewModel.getReviewById(parseInt(req.params.id));
    if (!review) return sendError(res, 'Review not found', 404);
    return sendSuccess(res, review);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all reviews (with skip/take pagination)
export const getReviews = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const reviews = await prisma.review.findMany({
      skip,
      take,
      include: {
        client: true,
        staff: true,
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, reviews);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateReview = async (req, res) => {
  try {
    const review = await reviewModel.updateReview(parseInt(req.params.id), req.body);
    return sendSuccess(res, review);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const deleteReview = async (req, res) => {
  try {
    await reviewModel.deleteReview(parseInt(req.params.id));
    return sendSuccess(res, null, 200, 'Review deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};