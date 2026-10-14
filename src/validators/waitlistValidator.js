// validators/waitlistValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, isFutureDate, withSafeValidation } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';
import { assertServiceBookable } from '../utils/serviceAvailability.js';


// NOTE: no clientId and no status here on purpose — the controller derives
// the client from the authenticated session and the status always starts
// PENDING. Anything a caller sends for those is ignored.
export const validateWaitlistCreate = [
  body('serviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid service ID')
    .custom(withSafeValidation(async (serviceId) => {
      if (serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: parseInt(serviceId) },
          include: { category: { select: { isActive: true } } },
        });
        assertServiceBookable(service);
      }
      return true;
    })),

  body('preferredDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (value && !isFutureDate(value)) {
        throw new Error('Preferred date must be in the future');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateWaitlistUpdate = [
  param('id')
    .isInt().withMessage('Invalid waitlist ID'),

  body('status')
    .optional()
    .isIn(['PENDING', 'NOTIFIED', 'BOOKED', 'CANCELLED']).withMessage('Invalid waitlist status'),

  body('preferredDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (value && !isFutureDate(value)) {
        throw new Error('Preferred date must be in the future');
      }
      return true;
    }),

  handleValidationErrors,
];