// validators/validationHelpers.js
import { validationResult } from 'express-validator';
import { isDeliberateAppError } from '../utils/errorMessages.js';

/**
 * Wraps a .custom() validator callback that performs its own Prisma
 * lookups (rather than going through a controller's try/catch).
 * express-validator collects whatever a custom validator throws and puts
 * its .message straight into the response body via handleValidationErrors
 * below — so a raw Prisma/driver failure inside a validator (a connection
 * blip, a Neon cold-start timeout) would otherwise leak verbatim, in a
 * code path controllers never see.
 *
 * Deliberate throws the validator already does on purpose (e.g.
 * `throw new Error('Client not found')`, written directly in the
 * validator to be shown to the user) pass through completely unchanged —
 * only genuine Prisma/driver/runtime failures get swapped for a generic
 * message.
 */
export function withSafeValidation(fn, fallbackMessage = 'Something went wrong while checking that. Please try again.') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isDeliberateAppError(err)) throw err;
      console.error(err);
      throw new Error(fallbackMessage);
    }
  };
}

/**
 * Middleware to check validation results
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Custom validator: Check if date is in the future
 */
export const isFutureDate = (value) => {
  const date = new Date(value);
  const now = new Date();
  return date > now;
};

/**
 * Custom validator: Check if date is within business hours
 * @deprecated Superseded by utils/businessHours.js's isWithinBusinessHours(),
 * which reads the admin-configurable schedule instead of this fixed one.
 * Left in place only in case anything still imports it directly.
 */
export const isBusinessHours = (value) => {
  const date = new Date(value);
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday-Saturday, 9 AM - 6 PM
  return day >= 1 && day <= 6 && hour >= 9 && hour < 18;
};

/**
 * Custom validator: Ghana phone number format
 */
export const isGhanaPhone = (value) => {
  // Ghana phone: +233XXXXXXXXX or 0XXXXXXXXXX
  const phoneRegex = /^(\+233|0)[2-9]\d{8}$/;
  return phoneRegex.test(value.replace(/\s+/g, ''));
};

/**
 * Custom validator: Strong password
 */
export const isStrongPassword = (value) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(value);
};

/**
 * Sanitize phone number
 */
export const sanitizePhone = (value) => {
  if (!value) return value;
  
  // Remove spaces and format
  let cleaned = value.replace(/\s+/g, '');
  
  // Convert 0XX to +233XX
  if (cleaned.startsWith('0')) {
    cleaned = '+233' + cleaned.slice(1);
  }
  
  return cleaned;
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               