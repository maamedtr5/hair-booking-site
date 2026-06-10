// validators/paymentValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

export const validatePaymentCreate = [
  body('bookingId')
    .notEmpty().withMessage('Booking ID is required')
    .isInt({ min: 1 }).withMessage('Invalid booking ID'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .custom((value) => {
      // Max 1 million GHS
      if (value > 1000000) {
        throw new Error('Amount exceeds maximum limit');
      }
      return true;
    }),

  body('currency')
    .optional()
    .isIn(['GHS', 'USD', 'EUR']).withMessage('Invalid currency'),

  body('method')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['CASH', 'CARD', 'MOBILE_MONEY']).withMessage('Invalid payment method'),

  body('provider')
    .notEmpty().withMessage('Payment provider is required')
    .isIn(['PAYSTACK', 'CASH', 'MOBILE_MONEY']).withMessage('Invalid payment provider'),

  body('transactionRef')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Transaction reference too long'),

  handleValidationErrors,
];