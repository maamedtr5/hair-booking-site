// validators/serviceCategoryValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, withSafeValidation } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';

const validateFormTemplateExists = withSafeValidation(async (value) => {
  if (value === null || value === undefined || value === '') return true;
  const template = await prisma.formTemplate.findUnique({ where: { id: parseInt(value, 10) } });
  if (!template) {
    throw new Error('Consultation form not found');
  }
  return true;
});

export const validateCategoryCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 10000 }).withMessage('Display order must be a non-negative whole number'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('formTemplateId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Invalid consultation form')
    .custom(validateFormTemplateExists),

  handleValidationErrors,
];

export const validateCategoryUpdate = [
  param('id').isInt().withMessage('Invalid category ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 10000 }).withMessage('Display order must be a non-negative whole number'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('formTemplateId')
    .optional({ nullable: true })
    .custom((value) => value === null || Number.isInteger(Number(value)))
    .withMessage('Invalid consultation form')
    .custom(validateFormTemplateExists),

  handleValidationErrors,
];

export const validateCategoryIdParam = [
  param('id').isInt().withMessage('Invalid category ID'),
  handleValidationErrors,
];
