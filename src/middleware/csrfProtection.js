// src/middleware/csrfProtection.js
import { CSRF_COOKIE } from '../utils/authCookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints that establish authentication should not require
// an already-existing CSRF token.
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
]);

const CSRF_EXEMPT_PREFIXES = ['/webhooks'];

export function csrfProtection(req, res, next) {
  // Safe/read-only requests do not need CSRF protection.
  if (SAFE_METHODS.has(req.method)) return next();

  // Authentication bootstrap endpoints do not require CSRF.
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  // Webhooks are authenticated/validated separately.
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // Only enforce CSRF when the browser is sending
  // the session cookie.
  if (!req.cookies?.session_token) return next();

  const cookieValue = req.cookies?.[CSRF_COOKIE];
  const headerValue = req.headers['x-csrf-token'];

  if (!cookieValue || !headerValue || cookieValue !== headerValue) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing or invalid.',
    });
  }

  next();
}