 // validators/formValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


/**
 * Validate form fields structure
 */
const validateFormFields = (fields) => {
  if (!fields) {
    throw new Error('Form fields are required');
  }

  if (typeof fields !== 'object') {
    throw new Error('Form fields must be a valid JSON object or array');
  }

  // If it's an array, each item should have a structure
  if (Array.isArray(fields)) {
    fields.forEach((field, index) => {
      if (!field.name || typeof field.name !== 'string') {
        throw new Error(`Field at index ${index} must have a name property`);
      }
      if (!field.type || typeof field.type !== 'string') {
        throw new Error(`Field at index ${index} must have a type property`);
      }
      
      const validTypes = ['text', 'email', 'number', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time'];
      if (!validTypes.includes(field.type)) {
        throw new Error(`Field "${field.name}" has invalid type. Must be one of: ${validTypes.join(', ')}`);
      }
    });
  }

  return true;
};

export const validateFormCreate = [
  body('clientId')
    .notEmpty().withMessage('Client ID is required')
    .isInt({ min: 1 }).withMessage('Invalid client ID')
    .custom(async (clientId) => {
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
      });
      if (!client) {
        throw new Error('Client not found');
      }
      return true;
    }),

  body('bookingId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid booking ID')
    .custom(async (bookingId) => {
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: parseInt(bookingId) },
        });
        if (!booking) {
          throw new Error('Booking not found');
        }
      }
      return true;
    }),

  body('title')
    .trim()
    .notEmpty().withMessage('Form title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('fields')
    .notEmpty().withMessage('Form fields are required')
    .custom((value) => {
      try {
        const fields = typeof value === 'string' ? JSON.parse(value) : value;
        return validateFormFields(fields);
      } catch (error) {
  throw new Error(
    'Permissions must be valid JSON: ' + error.message,
    { cause: error }
  );
}
    }),

  handleValidationErrors,
];

export const validateFormUpdate = [
  param('id')
    .isInt().withMessage('Invalid form ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('fields')
    .optional()
    .custom((value) => {
      try {
        const fields = typeof value === 'string' ? JSON.parse(value) : value;
        return validateFormFields(fields);
      } catch (error) {
  throw new Error(
    'Permissions must be valid JSON: ' + error.message,
    { cause: error }
  );
}
    }),

  handleValidationErrors,
];