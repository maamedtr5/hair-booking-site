// validators/bookingValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


export const validateBookingCreate = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isInt({ min: 1 }).withMessage('Invalid appointment ID')
    .custom(async (appointmentId) => {
      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(appointmentId) },
      });
      if (!appointment) {
        throw new Error('Appointment not found');
      }
      
      // Check if appointment already has a booking
      const existingBooking = await prisma.booking.findUnique({
        where: { appointmentId: parseInt(appointmentId) },
      });
      if (existingBooking) {
        throw new Error('This appointment already has a booking');
      }
      
      return true;
    }),

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

  body('userId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid user ID'),

  body('promocodeId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid promocode ID')
    .custom(async (promocodeId) => {
      if (promocodeId) {
        const promocode = await prisma.promocode.findUnique({
          where: { id: parseInt(promocodeId) },
        });
        if (!promocode) {
          throw new Error('Promocode not found');
        }
        if (!promocode.isActive) {
          throw new Error('Promocode is not active');
        }
        
        const now = new Date();
        if (now < promocode.validFrom || now > promocode.validUntil) {
          throw new Error('Promocode is not valid at this time');
        }
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid booking status'),

  handleValidationErrors,
];

export const validateBookingUpdate = [
  param('id')
    .isInt().withMessage('Invalid booking ID'),

  body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid booking status'),

  body('promocodeId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid promocode ID')
    .custom(async (promocodeId) => {
      if (promocodeId) {
        const promocode = await prisma.promocode.findUnique({
          where: { id: parseInt(promocodeId) },
        });
        if (!promocode) {
          throw new Error('Promocode not found');
        }
        if (!promocode.isActive) {
          throw new Error('Promocode is not active');
        }

        const now = new Date();
        if (now < promocode.validFrom || now > promocode.validUntil) {
          throw new Error('Promocode is not valid at this time');
        }
      }
      return true;
    }),

  handleValidationErrors,
];