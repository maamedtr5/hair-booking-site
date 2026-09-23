// validators/serviceValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, withSafeValidation } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';

const validateCategoryExists = withSafeValidation(async (categoryId) => {
  const category = await prisma.serviceCategory.findUnique({ where: { id: parseInt(categoryId, 10) } });
  if (!category) {
    throw new Error('Category not found');
  }
  return true;
});

export const validateServiceCreate = [
  body('categoryId')
    .notEmpty().withMessage('Category is required')
    .isInt({ min: 1 }).withMessage('Invalid category')
    .custom(validateCategoryExists),

  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number')
    .custom((value) => {
      if (value > 10000) {
        throw new Error('Price exceeds maximum limit');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 10000 }).withMessage('Display order must be a non-negative whole number'),

  handleValidationErrors,
];

export const validateServiceUpdate = [
  param('id')
    .isInt().withMessage('Invalid service ID'),

  body('categoryId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid category')
    .custom(validateCategoryExists),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),

  body('price')
    .optional()
    .isFloat({ min: 0, max: 10000 }).withMessage('Price must be between 0 and 10000'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 10000 }).withMessage('Display order must be a non-negative whole number'),

  handleValidationErrors,
];