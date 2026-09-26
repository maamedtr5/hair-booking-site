// validators/reviewValidator.js
import { body } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validateReviewCreate = [
  // clientId is intentionally NOT accepted here — the reviewer is always
  // the authenticated user's own Client record (see
  // reviewController.resolveOwnClientId), never a value the client can
  // set. Accepting it would let one client post a review "from" another.

  body('serviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid service ID'),

  body('staffId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid staff ID'),

  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must not exceed 1000 characters')
    .matches(/^[^<>]*$/).withMessage('Comment cannot contain HTML tags'),

  handleValidationErrors,
];