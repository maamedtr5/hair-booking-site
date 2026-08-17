// src/utils/authCookies.js
import crypto from 'crypto';

const SESSION_COOKIE = 'session_token';
const CSRF_COOKIE = 'csrf_token';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches JWT's 1d expiry

const isProd = process.env.NODE_ENV === 'production';

// httpOnly: the whole point — JS (including injected XSS script) can
// never read this, so a leaked/injected script can no longer walk away
// with a usable session token the way it could when the JWT lived in
// localStorage.
// secure: only sent over HTTPS in production; disabled for local HTTP dev.
// sameSite 'lax': blocks the cookie from being attached to cross-site
// POST/PUT/DELETE requests (the actual CSRF vector) while still allowing
// normal top-level navigation (e.g. a Paystack redirect back to the site).
export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// Deliberately NOT httpOnly — the frontend reads this value directly and
// echoes it back as the X-CSRF-Token header on every mutating request
// (see csrfProtection.js). This is the "double submit cookie" pattern:
// SameSite=Lax already blocks most CSRF, but a cross-subdomain deployment
// or a browser quirk could still send the session cookie on a same-site
// request from an attacker-controlled subdomain — the CSRF token can't be
// read cross-origin (no-cors responses can't be read by attacker JS, and
// this cookie isn't readable cross-site either), so it closes that gap.
export function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
  return csrfToken;
}

export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export { SESSION_COOKIE, CSRF_COOKIE };
