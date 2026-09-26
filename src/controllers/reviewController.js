// controllers/reviewController.js
import { prisma } from '../lib/prisma.js';
import reviewModel from '../models/Review.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';

// clientId must never come from the request body — a logged-in client
// could otherwise post a review "from" any other client. It's always
// derived from the authenticated user's own Client record instead.
async function resolveOwnClientId(req) {
  const client = await prisma.client.findUnique({ where: { userId: req.user.id } });
  if (!client) {
    const err = new Error('Only client accounts can leave reviews.');
    err.status = 403;
    throw err;
  }
  return client.id;
}

// Only these fields are ever attacker/author-controlled. clientId is
// deliberately excluded here too — see resolveOwnClientId.
const REVIEW_WRITABLE_FIELDS = ['serviceId', 'staffId', 'rating', 'comment'];

function pickReviewFields(body) {
  const data = {};
  for (const field of REVIEW_WRITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

export const createReview = async (req, res) => {
  try {
    const clientId = await resolveOwnClientId(req);
    const review = await reviewModel.createReview({ ...pickReviewFields(req.body), clientId });
    return sendSuccess(res, review, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), err.status || 400);
  }
};

export const getReview = async (req, res) => {
  try {
    const review = await reviewModel.getReviewById(parseInt(req.params.id));
    if (!review) return sendError(res, 'Review not found', 404);
    return sendSuccess(res, review);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all reviews (with skip/take pagination)
export const getReviews = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

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
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Only the review's own author, or staff/admin (e.g. moderating an
// abusive comment), may modify or remove it — never any other client.
async function assertCanModifyReview(req, id) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!review) {
    const err = new Error('Review not found');
    err.status = 404;
    throw err;
  }

  const isOwner = review.client?.userId === req.user.id;
  const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user.role);
  if (!isOwner && !isStaffOrAdmin) {
    const err = new Error('Not authorized to modify this review.');
    err.status = 403;
    throw err;
  }
  return review;
}

export const updateReview = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await assertCanModifyReview(req, id);
    const review = await reviewModel.updateReview(id, pickReviewFields(req.body));
    return sendSuccess(res, review);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), err.status || 400);
  }
};

export const deleteReview = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await assertCanModifyReview(req, id);
    await reviewModel.deleteReview(id);
    return sendSuccess(res, null, 200, 'Review deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), err.status || 400);
  }
};
