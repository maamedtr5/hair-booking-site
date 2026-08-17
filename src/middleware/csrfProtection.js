// src/middleware/csrfProtection.js
import { CSRF_COOKIE } from '../utils/authCookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes that are never called by the browser with cookies attached, so
// there is no CSRF cookie to compare against — third-party webhooks
// (Paystack) are server-to-server, not something a browser session
// initiates. These already skip `authenticate` entirely; skip this too
// for the same reason.
const CSRF_EXEMPT_PREFIXES = ['/webhooks'];

// Double-submit cookie check: the CSRF cookie is readable by JS
// (deliberately — see authCookies.js), so the frontend echoes its value
// back as a header. An attacker's cross-site page can trigger a request
// that *includes* the victim's cookies (that's the CSRF vector this
// exists to stop) but can't *read* those cookies to also set a matching
// header — cross-origin script has no access to another site's cookie
// jar. A mismatch (or missing header) means the request didn't
// originate from this app's own frontend JS.
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  // Only applies to cookie-authenticated requests. A request carrying a
  // Bearer token instead (API tooling, no cookie jar) never attached the
  // session cookie in the first place, so there's nothing for a
  // cross-site page to ride along on — CSRF requires the browser to have
  // auto-attached credentials the attacker's page can't see or set.
  if (!req.cookies?.session_token) return next();

  const cookieValue = req.cookies?.[CSRF_COOKIE];
  const headerValue = req.headers['x-csrf-token'];

  if (!cookieValue || !headerValue || cookieValue !== headerValue) {
    return res.status(403).json({ success: false, message: 'CSRF token missing or invalid.' });
  }

  next();
}
