// validators/formTemplateValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'SCALE',
  'DATE',
  'CHECKBOX',
  'SIGNATURE',
];

const OPTION_TYPES = new Set(['SINGLE_SELECT', 'MULTI_SELECT']);

export const validateTemplateCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Form name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Name must be between 2 and 150 characters'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  handleValidationErrors,
];

export const validateTemplateUpdate = [
  param('id').isInt().withMessage('Invalid form template ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('Name must be between 2 and 150 characters'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  handleValidationErrors,
];

export const validateTemplateIdParam = [
  param('id').isInt().withMessage('Invalid form template ID'),
  handleValidationErrors,
];

// Shared body rules for both "add field" and "edit field" — required-ness
// differs (create needs label/fieldType, update makes everything
// optional), so the two exports below share this list where possible but
// diverge on .notEmpty() vs .optional().
function optionsMatchFieldType(options, { req }) {
  const fieldType = req.body.fieldType;
  if (!OPTION_TYPES.has(fieldType)) return true; // irrelevant for this type

  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('Select fields need at least 2 options');
  }
  const seen = new Set();
  for (const opt of options) {
    if (typeof opt !== 'string' || !opt.trim()) {
      throw new Error('Every option must be a non-empty label');
    }
    if (seen.has(opt.trim().toLowerCase())) {
      throw new Error('Options must be unique');
    }
    seen.add(opt.trim().toLowerCase());
  }
  return true;
}

export const validateFieldCreate = [
  param('id').isInt().withMessage('Invalid form template ID'),

  body('label')
    .trim()
    .notEmpty().withMessage('Question label is required')
    .isLength({ min: 1, max: 300 }).withMessage('Label must be 300 characters or fewer'),

  body('section')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Section heading must be 150 characters or fewer'),

  body('helpText')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Help text must be 500 characters or fewer'),

  body('fieldType')
    .notEmpty().withMessage('Field type is required')
    .isIn(FIELD_TYPES).withMessage(`Field type must be one of: ${FIELD_TYPES.join(', ')}`),

  body('options')
    .optional({ nullable: true })
    .isArray().withMessage('Options must be a list')
    .custom(optionsMatchFieldType),

  body('required')
    .optional()
    .isBoolean().withMessage('required must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative whole number'),

  handleValidationErrors,
];

export const validateFieldUpdate = [
  param('id').isInt().withMessage('Invalid form template ID'),
  param('fieldId').isInt().withMessage('Invalid field ID'),

  body('label')
    .optional()
    .trim()
    .isLength({ min: 1, max: 300 }).withMessage('Label must be 300 characters or fewer'),

  body('section')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Section heading must be 150 characters or fewer'),

  body('helpText')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Help text must be 500 characters or fewer'),

  body('fieldType')
    .optional()
    .isIn(FIELD_TYPES).withMessage(`Field type must be one of: ${FIELD_TYPES.join(', ')}`),

  body('options')
    .optional({ nullable: true })
    .isArray().withMessage('Options must be a list')
    .custom(optionsMatchFieldType),

  body('required')
    .optional()
    .isBoolean().withMessage('required must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative whole number'),

  handleValidationErrors,
];

export const validateFieldIdParams = [
  param('id').isInt().withMessage('Invalid form template ID'),
  param('fieldId').isInt().withMessage('Invalid field ID'),
  handleValidationErrors,
];

export const validateReorder = [
  param('id').isInt().withMessage('Invalid form template ID'),
  body('fieldIds')
    .isArray({ min: 1 }).withMessage('fieldIds must be a non-empty list')
    .custom((arr) => arr.every((id) => Number.isInteger(Number(id))))
    .withMessage('fieldIds must all be integers'),
  handleValidationErrors,
];
