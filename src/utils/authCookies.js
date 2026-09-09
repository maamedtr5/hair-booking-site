// src/utils/authCookies.js
import crypto from 'crypto';

const SESSION_COOKIE = 'session_token';
const CSRF_COOKIE = 'csrf_token';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches JWT's 1d expiry

const isProd = process.env.NODE_ENV === 'production';

// sameSite: 'lax' only sends the cookie on same-site requests (or
// top-level navigation). Frontend and backend are deployed as two
// separate Vercel projects on two different domains — every API call is
// cross-site from the browser's perspective, so 'lax' silently drops the
// cookie on every request except the initial login response itself. That
// looked exactly like "login works but nothing after it does" — a 200 on
// /auth/login, then every subsequent authenticated request behaving as
// logged-out, because the cookie never actually made it back.
//
// 'none' is required for a cross-site cookie to be sent at all, and
// browsers reject 'none' outright unless 'secure' is also true — so both
// must change together, only in production (localhost stays 'lax' since
// frontend/backend are same-site with each other there).
const crossSiteCookieOptions = isProd
  ? { secure: true, sameSite: 'none' }
  : { secure: false, sameSite: 'lax' };

// httpOnly: the whole point — JS (including injected XSS script) can
// never read this, so a leaked/injected script can no longer walk away
// with a usable session token the way it could when the JWT lived in
// localStorage.
export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    ...crossSiteCookieOptions,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/', ...crossSiteCookieOptions });
}

// Deliberately NOT httpOnly — the frontend reads this value directly and
// echoes it back as the X-CSRF-Token header on every mutating request
// (see csrfProtection.js). This is the "double submit cookie" pattern —
// see original comment below for why it's still needed on top of SameSite.
export function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    ...crossSiteCookieOptions,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
  return csrfToken;
}

export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, { path: '/', ...crossSiteCookieOptions });
}

export { SESSION_COOKIE, CSRF_COOKIE };