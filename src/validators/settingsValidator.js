                                                                                                                                                                                                                                                                                                                                                                                                                        // validators/settingsValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

import { prisma } from '../lib/prisma.js';

/**
 * Validate settings value based on key
 */
const validateSettingsValue = (key, value) => {
  const settingsSchemas = {
    working_hours: {
      type: 'object',
      required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    business_info: {
      type: 'object',
      required: ['name', 'phone', 'email', 'address'],
    },
    booking_settings: {
      type: 'object',
      fields: ['advanceBookingDays', 'cancellationHours', 'maxDailyBookings'],
    },
    notification_settings: {
      type: 'object',
      fields: ['emailEnabled', 'smsEnabled', 'reminderHours'],
    },
  };

  const schema = settingsSchemas[key];
  
  if (schema && schema.type === 'object') {
    if (typeof value !== 'object') {
      throw new Error(`Setting "${key}" must be an object`);
    }

    if (schema.required) {
      const missing = schema.required.filter(field => !(field in value));
      if (missing.length > 0) {
        throw new Error(`Missing required fields for "${key}": ${missing.join(', ')}`);
      }
    }
  }

  return true;
};

export const validateSettingsCreate = [
  body('key')
    .trim()
    .notEmpty().withMessage('Settings key is required')
    .isLength({ min: 2, max: 100 }).withMessage('Key must be between 2 and 100 characters')
    .matches(/^[a-z0-9_]+$/).withMessage('Key can only contain lowercase letters, numbers, and underscores')
    .custom(async (key) => {
      const existing = await prisma.settings.findUnique({
        where: { key },
      });
      if (existing) {
        throw new Error('Settings key already exists. Use update instead.');
      }
      return true;
    }),

  body('value')
    .notEmpty().withMessage('Settings value is required')
    .custom((value, { req }) => {
  try {
    const parsedValue =
      typeof value === "string" ? JSON.parse(value) : value;

    return validateSettingsValue(req.body.key, parsedValue);
  } catch (error) {
    throw new Error(
      "Settings value must be valid JSON: " + error.message,
      {
        cause: error,
      }
    );
  }
}),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  handleValidationErrors,
];

export const validateSettingsUpdate = [
  param('id')
    .isInt().withMessage('Invalid settings ID'),

  body('value')
    .optional()
    .custom(async (value, { req }) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });

    const parsedValue =
      typeof value === "string" ? JSON.parse(value) : value;

    return validateSettingsValue(settings?.key || "", parsedValue);
  } catch (error) {
    throw new Error(
      "Settings value must be valid JSON: " + error.message,
      { cause: error }
    );
  }
}),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  // Prevent updating key
  body('key')
    .optional()
    .custom(() => {
      throw new Error('Settings key cannot be updated');
    }),

  handleValidationErrors,
];