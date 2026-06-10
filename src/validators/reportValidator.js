// src/validators/reportValidator.js
import { query } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validateRevenueReport = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateTopServicesReport = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),

  handleValidationErrors,
];
