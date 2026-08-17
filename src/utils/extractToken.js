// src/utils/extractToken.js
//
// Single source of truth for "where does the session JWT live on this
// request" — authMiddleware, optionalAuth, and app.js's rate-limit keying
// all need the exact same answer, and having three separate copies is how
// they'd eventually drift (one gets updated, the others don't).
//
// Cookie is checked first: the browser client no longer receives the raw
// token in any JSON response body (that's the whole point of the
// httpOnly-cookie migration — JS, including injected XSS script, can never
// read it). The Authorization header is kept as a fallback for non-browser
// clients (API testing tools, a future mobile app) that can't rely on a
// cookie jar.
export function extractToken(req) {
  const cookieToken = req.cookies?.session_token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  return authHeader?.split(' ')[1] || null;
}
