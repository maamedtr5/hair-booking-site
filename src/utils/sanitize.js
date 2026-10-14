// src/utils/sanitize.js
//
// Defense-in-depth: several controllers have, at different times, forgotten
// to strip the `password` hash off a nested `user`/`client.user` object
// before sending it in a response (appointments, clients, staff, admin all
// hit this). Rather than relying on every controller remembering to do it
// manually, sendSuccess() runs every payload through this once, centrally,
// so a nested password hash can never leak again even if a future include
// forgets to sanitize.
//
// It also strips the Google OAuth tokens that live on the same User row.
// The app requests the full `auth/calendar` scope, so a leaked refresh token
// is persistent read/write access to that person's calendar — far worse than
// a leaked hash. Those tokens are only ever used server-side (read straight
// from Prisma by the calendar service); no response should carry them.
const SENSITIVE_KEYS = new Set(['password', 'googleAccessToken', 'googleRefreshToken']);

export function stripPasswords(value) {
  if (Array.isArray(value)) {
    return value.map(stripPasswords);
  }

  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      clone[key] = stripPasswords(val);
    }
    return clone;
  }

  return value;
}
