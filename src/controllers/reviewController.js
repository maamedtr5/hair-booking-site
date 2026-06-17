// controllers/reviewController.js
import { prisma } from '../lib/prisma.js';
import reviewModel from '../models/review.js';

export const createReview = async (req, res) => {
  try {
    const review = await reviewModel.createReview(req.body);
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getReview = async (req, res) => {
  try {
    const review = await reviewModel.getReviewById(parseInt(req.params.id));
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(reviews);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


export const updateReview = async (req, res) => {
  try {
    const review = await reviewModel.updateReview(parseInt(req.params.id), req.body);
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    await reviewModel.deleteReview(parseInt(req.params.id));
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};