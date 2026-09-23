// src/utils/formAnswers.js
//
// Validates a client-submitted answer payload against the LIVE
// FormTemplate definition at booking time. This is the actual security
// boundary for a category's required consultation form (e.g.
// SCALP-FIRST) — client-side form rendering is a convenience, never the
// source of truth, since a direct API call could otherwise skip required
// questions entirely or submit answers that don't match an admin-defined
// option list.
//
// Throws a plain Error (readable, safe to show the client — see
// isDeliberateAppError in errorMessages.js) describing the FIRST problem
// found. Returns a normalized answers object, keyed by field id string,
// containing only values for fields that actually exist on the template —
// nothing else in the submitted payload is trusted or stored.

const TEXT_MAX = 500;
const TEXTAREA_MAX = 5000;
const SIGNATURE_MAX = 200;

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

export function validateAnswersAgainstTemplate(fields, rawAnswers) {
  const answers = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers) ? rawAnswers : {};
  const normalized = {};

  for (const field of fields) {
    const key = String(field.id);
    const value = answers[key];

    if (field.required && isBlank(value) && !(field.fieldType === 'MULTI_SELECT' && Array.isArray(value) && value.length > 0)) {
      const err = new Error(`Please answer: "${field.label}"`);
      err.status = 400;
      throw err;
    }

    if (isBlank(value)) continue; // optional and not answered — fine, nothing to store

    switch (field.fieldType) {
      case 'TEXT': {
        if (typeof value !== 'string' || value.length > TEXT_MAX) {
          throw fieldError(field, `must be text under ${TEXT_MAX} characters`);
        }
        normalized[key] = value.trim();
        break;
      }
      case 'TEXTAREA': {
        if (typeof value !== 'string' || value.length > TEXTAREA_MAX) {
          throw fieldError(field, `must be text under ${TEXTAREA_MAX} characters`);
        }
        normalized[key] = value.trim();
        break;
      }
      case 'SIGNATURE': {
        if (typeof value !== 'string' || value.trim().length === 0 || value.length > SIGNATURE_MAX) {
          throw fieldError(field, 'must be a valid signature');
        }
        normalized[key] = value.trim();
        break;
      }
      case 'SINGLE_SELECT': {
        const options = Array.isArray(field.options) ? field.options : [];
        if (typeof value !== 'string' || !options.includes(value)) {
          throw fieldError(field, 'must be one of the offered options');
        }
        normalized[key] = value;
        break;
      }
      case 'MULTI_SELECT': {
        const options = Array.isArray(field.options) ? field.options : [];
        if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !options.includes(v))) {
          throw fieldError(field, 'must be a list of the offered options');
        }
        normalized[key] = [...new Set(value)];
        break;
      }
      case 'SCALE': {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 1 || num > 5) {
          throw fieldError(field, 'must be a whole number from 1 to 5');
        }
        normalized[key] = num;
        break;
      }
      case 'DATE': {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw fieldError(field, 'must be a valid date');
        }
        normalized[key] = date.toISOString();
        break;
      }
      case 'CHECKBOX': {
        if (typeof value !== 'boolean') {
          throw fieldError(field, 'must be true or false');
        }
        normalized[key] = value;
        break;
      }
      default:
        // Unknown/legacy field type on the stored template — skip rather
        // than fail the whole booking over a data-modeling edge case.
        break;
    }
  }

  return normalized;
}

function fieldError(field, suffix) {
  const err = new Error(`"${field.label}" ${suffix}`);
  err.status = 400;
  return err;
}
