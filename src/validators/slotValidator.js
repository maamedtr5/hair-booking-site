// src/validators/slotValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validateSlotCreate = [
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('End time must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['AVAILABLE', 'BOOKED', 'CANCELLED']).withMessage('Invalid slot status'),

  handleValidationErrors,
];

export const validateSlotUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid slot ID'),

  body('startTime')
    .optional()
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .optional()
    .isISO8601().withMessage('End time must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['AVAILABLE', 'BOOKED', 'CANCELLED']).withMessage('Invalid slot status'),

  handleValidationErrors,
];
