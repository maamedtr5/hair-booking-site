// validators/serviceImageValidator.js
import { param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validateImageIdParam = [
  param('id').isInt({ min: 1, max: 2147483647 }).withMessage('Invalid image ID'),
  handleValidationErrors,
];
