// src/validators/webhookValidator.js
import { header, body } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validatePaystackWebhook = [
  header('x-paystack-signature')
    .notEmpty().withMessage('Missing Paystack signature header'),

  body('event')
    .notEmpty().withMessage('Event type is required')
    .isString().withMessage('Event must be a string'),

  body('data')
    .notEmpty().withMessage('Event data is required')
    .isObject().withMessage('Event data must be an object'),

  body('data.reference')
    .notEmpty().withMessage('Transaction reference is required')
    .isString().withMessage('Transaction reference must be a string'),

  handleValidationErrors,
];
