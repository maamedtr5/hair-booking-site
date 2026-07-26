// validators/appointmentValidator.js (add this to existing)
import { body, param } from 'express-validator';
import { handleValidationErrors, isFutureDate } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';
import { getBusinessHoursConfig, isWithinBusinessHours } from '../utils/businessHours.js';


export const validateAppointmentCreate = [
  body('serviceId')
    .notEmpty().withMessage('Service ID is required')
    .isInt({ min: 1 }).withMessage('Invalid service ID')
    .custom(async (serviceId) => {
      const service = await prisma.service.findUnique({ 
        where: { id: parseInt(serviceId) } 
      });
      if (!service) {
        throw new Error('Service not found');
      }
      if (!service.isActive) {
        throw new Error('Service is not available');
      }
      return true;
    }),

  body('staffId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid staff ID')
    .custom(async (staffId) => {
      if (staffId) {
        const staff = await prisma.staff.findUnique({ 
          where: { id: parseInt(staffId) } 
        });
        if (!staff) {
          throw new Error('Staff member not found');
        }
      }
      return true;
    }),

  body('date')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Invalid date format (use ISO 8601)')
    .custom((value) => {
      if (!isFutureDate(value)) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    })
    .custom(async (value) => {
      const config = await getBusinessHoursConfig();
      if (!isWithinBusinessHours(new Date(value), config)) {
        throw new Error('Appointment must be during business hours');
      }
      return true;
    }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),

  body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),

  // Google Calendar Event ID - managed internally, block direct updates
  body('googleEventId')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Google Calendar event ID is managed automatically. Cannot be set manually.');
      }
      return true;
    }),

  // Reminder fields - managed internally
  body('reminderScheduled')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder scheduling is managed automatically');
      }
      return true;
    }),

  body('reminderSent')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder status is managed automatically');
      }
      return true;
    }),

  body('reminderSentAt')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder timestamp is managed automatically');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateAppointmentUpdate = [
  param('id')
    .isInt().withMessage('Invalid appointment ID'),

  body('serviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid service ID')
    .custom(async (serviceId) => {
      const service = await prisma.service.findUnique({ 
        where: { id: parseInt(serviceId) } 
      });
      if (!service) {
        throw new Error('Service not found');
      }
      return true;
    }),

  body('staffId')
    .optional()
    .isInt({ min: 1 }).withMessage('Invalid staff ID')
    .custom(async (staffId) => {
      const staff = await prisma.staff.findUnique({ 
        where: { id: parseInt(staffId) } 
      });
      if (!staff) {
        throw new Error('Staff member not found');
      }
      return true;
    }),

  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (!isFutureDate(value)) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    })
    .custom(async (value) => {
      const config = await getBusinessHoursConfig();
      if (!isWithinBusinessHours(new Date(value), config)) {
        throw new Error('Appointment must be during business hours');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),

  // Block direct updates to Google Calendar fields
  body('googleEventId')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Google Calendar event ID cannot be updated manually');
      }
      return true;
    }),

  body('reminderScheduled')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder fields are managed automatically');
      }
      return true;
    }),

  body('reminderSent')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder fields are managed automatically');
      }
      return true;
    }),

  body('reminderSentAt')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Reminder fields are managed automatically');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateBulkCancel = [
  body('appointmentIds')
    .isArray({ min: 1 }).withMessage('Must provide at least one appointment ID')
    .custom((ids) => {
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All appointment IDs must be positive integers');
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Internal validator for system updates (used by calendar sync)
 */
export const validateInternalAppointmentUpdate = [
  param('id')
    .isInt().withMessage('Invalid appointment ID'),

  body('googleEventId')
    .optional({ nullable: true })
    .isString().withMessage('Google event ID must be a string'),

  body('reminderScheduled')
    .optional()
    .isBoolean().withMessage('Reminder scheduled must be boolean'),

  body('reminderSent')
    .optional()
    .isBoolean().withMessage('Reminder sent must be boolean'),

  body('reminderSentAt')
    .optional({ nullable: true })
    .isISO8601().withMessage('Reminder sent at must be valid date'),

  handleValidationErrors,
];