// validators/reviewValidator.js
import { body } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validateReviewCreate = [
  body('clientId')
    .notEmpty().withMessage('Client ID is required')
    .isInt({ min: 1 }).withMessage('Invalid client ID'),

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