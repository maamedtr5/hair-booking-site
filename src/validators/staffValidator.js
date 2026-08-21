// validators/staffValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, withSafeValidation } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';   

export const validateStaffCreate = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt({ min: 1 }).withMessage('Invalid user ID')
    .custom(withSafeValidation(async (userId) => {
      const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      if (!user) {
        throw new Error('User not found');
      }
      if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
        throw new Error('User must have STAFF or ADMIN role');
      }
      return true;
    })),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),

  handleValidationErrors,
];

export const validateStaffUpdate = [
  param('id')
    .isInt().withMessage('Invalid staff ID'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),

  handleValidationErrors,
];
