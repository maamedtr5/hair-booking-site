// validators/userValidator.js
import { body, param } from 'express-validator';
import { handleValidationErrors, isStrongPassword, withSafeValidation } from './validationHelpers.js';
import { prisma } from '../lib/prisma.js';


export const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .custom(withSafeValidation(async (email) => {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('Email already registered');
      }
      return true;
    })),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character');
      }
      return true;
    }),

  body('role')
    .optional()
    .isIn(['ADMIN', 'STAFF', 'CLIENT']).withMessage('Invalid role. Must be ADMIN, STAFF, or CLIENT'),

  // Google Calendar fields - optional, managed internally
  body('googleAccessToken')
    .optional({ nullable: true })
    .isString().withMessage('Google access token must be a string')
    .custom((value, { req }) => {
      // Only allow system/admin to set these directly
      if (value && req.user?.role !== 'ADMIN') {
        throw new Error('Google tokens are managed internally');
      }
      return true;
    }),

  body('googleRefreshToken')
    .optional({ nullable: true })
    .isString().withMessage('Google refresh token must be a string')
    .custom((value, { req }) => {
      // Only allow system/admin to set these directly
      if (value && req.user?.role !== 'ADMIN') {
        throw new Error('Google tokens are managed internally');
      }
      return true;
    }),

  body('googleTokenExpiry')
    .optional({ nullable: true })
    .isISO8601().withMessage('Google token expiry must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      // Only allow system/admin to set these directly
      if (value && req.user?.role !== 'ADMIN') {
        throw new Error('Google token expiry is managed internally');
      }
      return true;
    }),

  handleValidationErrors,
];

export const validateUserLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

export const validateUserUpdate = [
  param('id')
    .isInt().withMessage('Invalid user ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .custom(withSafeValidation(async (email, { req }) => {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== parseInt(req.params.id)) {
        throw new Error('Email already in use');
      }
      return true;
    })),

  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .custom((value) => {
      if (!isStrongPassword(value)) {
        throw new Error('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character');
      }
      return true;
    }),

  body('role')
    .optional()
    .isIn(['ADMIN', 'STAFF', 'CLIENT']).withMessage('Invalid role'),

  // Google Calendar tokens - these should ONLY be updated via OAuth flow
  // Block direct updates except from system
  body('googleAccessToken')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      // Only internal system updates allowed (from googleCalendarService)
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Google Calendar tokens cannot be updated directly. Use /auth/google/calendar endpoint');
      }
      return true;
    }),

  body('googleRefreshToken')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Google Calendar tokens cannot be updated directly. Use /auth/google/calendar endpoint');
      }
      return true;
    }),

  body('googleTokenExpiry')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== undefined && !req.isInternalUpdate) {
        throw new Error('Google Calendar token expiry cannot be updated directly. Use /auth/google/calendar endpoint');
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validation for internal system updates (Google Calendar OAuth callback)
 * This bypasses the normal user update restrictions for Google tokens
 */
export const validateGoogleTokenUpdate = [
  param('id')
    .isInt().withMessage('Invalid user ID'),

  body('googleAccessToken')
    .notEmpty().withMessage('Google access token is required')
    .isString().withMessage('Access token must be a string'),

  body('googleRefreshToken')
    .notEmpty().withMessage('Google refresh token is required')
    .isString().withMessage('Refresh token must be a string'),

  body('googleTokenExpiry')
    .optional({ nullable: true })
    .isISO8601().withMessage('Token expiry must be a valid date')
    .custom((value) => {
      if (value) {
        const expiryDate = new Date(value);
        const now = new Date();
        if (expiryDate <= now) {
          throw new Error('Token expiry date must be in the future');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validation for disconnecting Google Calendar
 */
export const validateGoogleDisconnect = [
  param('id')
    .isInt().withMessage('Invalid user ID')
    .custom(withSafeValidation(async (id, { req }) => {
      // User can only disconnect their own calendar unless admin
      if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(id)) {
        throw new Error('You can only disconnect your own Google Calendar');
      }
      return true;
    })),

  handleValidationErrors,
];                                                                                                                                                                                                                                                                                                                                                                            