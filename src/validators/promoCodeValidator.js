// validators/promoCodeValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validatePromoCodeCreate = [
  body('code')
    .trim()
    .notEmpty().withMessage('Promo code is required')
    .isLength({ min: 3, max: 20 }).withMessage('Code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9_-]+$/).withMessage('Code can only contain uppercase letters, numbers, hyphens, and underscores')
    .toUpperCase(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description must not exceed 200 characters'),

  body('discount')
    .notEmpty().withMessage('Discount is required')
    .isFloat({ min: 0 }).withMessage('Discount must be a positive number')
    .custom((value, { req }) => {
      if (req.body.type === 'PERCENTAGE' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      if (req.body.type === 'FIXED' && value > 10000) {
        throw new Error('Fixed discount cannot exceed 10000 GHS');
      }
      return true;
    }),

  body('type')
    .notEmpty().withMessage('Discount type is required')
    .isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),

  body('validFrom')
    .notEmpty().withMessage('Valid from date is required')
    .isISO8601().withMessage('Invalid date format'),

  body('validUntil')
    .notEmpty().withMessage('Valid until date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value, { req }) => {
      const validFrom = new Date(req.body.validFrom);
      const validUntil = new Date(value);
      if (validUntil <= validFrom) {
        throw new Error('Valid until date must be after valid from date');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  handleValidationErrors,
];

export const validatePromoCodeUpdate = [
  param('id')
    .isInt().withMessage('Invalid promo code ID'),

  body('code')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9_-]+$/).withMessage('Code can only contain uppercase letters, numbers, hyphens, and underscores')
    .toUpperCase(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description must not exceed 200 characters'),

  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be a positive number')
    .custom((value, { req }) => {
      if (req.body.type === 'PERCENTAGE' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      if (req.body.type === 'FIXED' && value > 10000) {
        throw new Error('Fixed discount cannot exceed 10000 GHS');
      }
      return true;
    }),

  body('type')
    .optional()
    .isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),

  body('validFrom')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('validUntil')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value, { req }) => {
      if (req.body.validFrom) {
        const validFrom = new Date(req.body.validFrom);
        const validUntil = new Date(value);
        if (validUntil <= validFrom) {
          throw new Error('Valid until date must be after valid from date');
        }
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  handleValidationErrors,
];
