// validators/waitlistValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, isFutureDate } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


export const validateWaitlistCreate = [
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

  body('serviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid service ID')
    .custom(async (serviceId) => {
      if (serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: parseInt(serviceId) },
        });
        if (!service) {
          throw new Error('Service not found');
        }
      }
      return true;
    }),

  body('preferredDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (value && !isFutureDate(value)) {
        throw new Error('Preferred date must be in the future');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['PENDING', 'NOTIFIED', 'BOOKED', 'CANCELLED']).withMessage('Invalid waitlist status'),

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