// validators/clientFormValidator.js
//
// Shape/size bounds for the consent and intake endpoints. These routes were
// previously unvalidated with a 10 MB body limit, so anyone could store
// arbitrarily large blobs in the database. Authorization (who may write for
// which client) lives in utils/clientAccess.js.
import { body } from 'express-validator';
import { handleValidationErrors } from './validationHelpers.js';

const optionalText = (field, max) =>
  body(field)
    .optional({ nullable: true })
    .isString().withMessage(`${field} must be text`)
    .isLength({ max }).withMessage(`${field} must not exceed ${max} characters`);

export const validateConsentCreate = [
  body('clientId').isInt({ min: 1 }).withMessage('A valid clientId is required'),
  body('consentGiven').isBoolean({ strict: true }).withMessage('consentGiven must be true or false'),
  optionalText('signature', 10000),
  // Guest ownership proof (see utils/clientAccess.js)
  body('appointmentId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid appointmentId'),
  optionalText('email', 254),
  handleValidationErrors,
];

export const validateIntakeCreate = [
  body('clientId').isInt({ min: 1 }).withMessage('A valid clientId is required'),
  optionalText('hairType', 200),
  optionalText('scalpCondition', 1000),
  optionalText('productPreference', 1000),
  optionalText('visitReason', 1000),
  optionalText('lastChemicalTreatment', 1000),
  optionalText('currentProducts', 1000),
  optionalText('goals', 1000),
  optionalText('allergies', 1000),
  optionalText('notes', 2000),
  handleValidationErrors,
];
