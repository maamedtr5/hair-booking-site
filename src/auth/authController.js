// src/auth/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js'; // shared singleton
import { sendSuccess, sendError } from '../utils/response.js';
import { sendEmail } from '../services/emailService.js';
import { setSessionCookie, clearSessionCookie, setCsrfCookie, clearCsrfCookie } from '../utils/authCookies.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
// Kill switch for admin 2FA. All the OTP code below stays in place —
// this just decides whether login() branches into it. Flip
// ADMIN_OTP_ENABLED=true in .env when ready to turn it back on; nothing
// else needs to change. Defaults OFF (safer to fail open to "unset" than
// to silently require a code no one asked for).
const ADMIN_OTP_ENABLED = process.env.ADMIN_OTP_ENABLED === 'true';
// Separate secret purpose from the real session JWT via a distinct claim
// (`purpose: 'login-otp'`) rather than a separate signing secret — simpler
// to operate, and authMiddleware already rejects anything without a valid
// session `jti`, so a pending-OTP token can never be used as a real
// session token even if someone tried to replay it against a protected route.
const OTP_TOKEN_TTL = '5m';

// Creates the session row that authMiddleware/logout rely on for revocation,
// and signs a JWT whose `jti` claim points at that session's id. Without this,
// tokens are stateless and "logout" can never actually invalidate a token.
async function issueSession(req, user) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent: req.headers['user-agent']?.slice(0, 255) || null,
      ipAddress: req.ip || null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d', jwtid: session.id }
  );

  return token;
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function hashOtpCode(code) {
  // A 6-digit code has only 1,000,000 possibilities — bcrypt's slowness
  // buys nothing extra here (the real brute-force defenses are
  // OTP_MAX_ATTEMPTS + the 5-minute expiry + the route's rate limiter),
  // and SHA-256 keeps issuing/verifying an OTP cheap under load.
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Generates, stores (hashed), and emails a fresh 6-digit code for the
// given user, invalidating any still-pending codes first so only the
// most recent one is ever valid — a user who hits "resend" can't end up
// with several simultaneously-valid codes floating around.
async function issueLoginOtp(user) {
  await prisma.loginOtp.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() }, // treat superseded codes as consumed, not valid
  });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.loginOtp.create({
    data: {
      userId: user.id,
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  // Email delivery failures shouldn't be swallowed silently — if Resend
  // is down, the admin needs to know they won't be receiving a code
  // rather than staring at "check your email" forever.
  await sendEmail({
    to: user.email,
    template: 'adminOtpCode',
    data: { name: user.name, code },
  });
}

function signOtpToken(user) {
  return jwt.sign(
    { id: user.id, purpose: 'login-otp' },
    process.env.JWT_SECRET,
    { expiresIn: OTP_TOKEN_TTL }
  );
}

// Decodes and validates a pending-OTP token, returning the userId it was
// issued for. Never trust a client-supplied userId directly for OTP
// verification — that would let someone submit guesses against an
// arbitrary account instead of only the one they actually authenticated
// the first factor for.
function verifyOtpToken(otpToken) {
  let decoded;
  try {
    decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Your session expired — please sign in again.');
    err.status = 401;
    throw err;
  }
  if (decoded.purpose !== 'login-otp' || !decoded.id) {
    const err = new Error('Invalid verification session.');
    err.status = 401;
    throw err;
  }
  return decoded.id;
}

// REGISTER — public self-signup. Role is ALWAYS forced to CLIENT here.
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body; // role intentionally not read

    if (!name || name.trim().length < 2) {
      return sendError(res, 'Name is required and must be at least 2 characters long.', 400);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 'Invalid email format.', 400);
    }

    if (!isStrongPassword(password)) {
      return sendError(
        res,
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
        400
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return sendError(res, 'Email already exists. Please use another email.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'CLIENT', // hardcoded
      },
    });

    const token = await issueSession(req, user);
    setSessionCookie(res, token);
    const csrfToken = setCsrfCookie(res);
    return sendSuccess(res, { user: sanitizeUser(user), csrfToken }, 201);
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'P2002') {
      return sendError(res, 'Email already exists.', 409);
    }
    return sendError(res, 'Registration failed.', 500);
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { staff: true, client: true, admin: true },
    });
    if (!user) return sendError(res, 'Invalid credentials', 401);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return sendError(res, 'Invalid credentials', 401);

    // Admin accounts get a second factor before a real session is issued.
    // Password alone is enough for the login *attempt* to succeed, but not
    // enough to walk away with a usable token — that only happens after
    // /auth/verify-otp confirms the emailed code.
    if (user.role === 'ADMIN' && ADMIN_OTP_ENABLED) {
      await issueLoginOtp(user);
      return sendSuccess(res, {
        otpRequired: true,
        otpToken: signOtpToken(user),
        message: `We sent a 6-digit code to ${user.email}.`,
      });
    }

    const token = await issueSession(req, user);
    setSessionCookie(res, token);
    const csrfToken = setCsrfCookie(res);
    return sendSuccess(res, { user: sanitizeUser(user), csrfToken });
  } catch (err) {
    console.error('Login error:', err);
    return sendError(res, 'Login failed.', 500);
  }
};

// VERIFY-OTP — second factor for admin login. Issues the real session
// only once the emailed code is confirmed.
export const verifyOtp = async (req, res) => {
  try {
    const { otpToken, code } = req.body;
    if (!otpToken || !code) {
      return sendError(res, 'otpToken and code are required.', 400);
    }

    const userId = verifyOtpToken(otpToken);

    const otp = await prisma.loginOtp.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      return sendError(res, 'No pending code found. Please sign in again.', 401);
    }
    if (otp.expiresAt < new Date()) {
      return sendError(res, 'That code has expired. Please sign in again to get a new one.', 401);
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return sendError(res, 'Too many incorrect attempts. Please sign in again to get a new code.', 429);
    }

    // Constant-time compare — a naive === on hashes leaks timing
    // information proportional to how many leading bytes match, which is
    // exactly the kind of side channel worth closing on an auth path.
    const submittedHash = Buffer.from(hashOtpCode(String(code).trim()));
    const storedHash = Buffer.from(otp.codeHash);
    const isMatch =
      submittedHash.length === storedHash.length &&
      crypto.timingSafeEqual(submittedHash, storedHash);

    if (!isMatch) {
      await prisma.loginOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
      return sendError(
        res,
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Incorrect code. Please sign in again to get a new one.',
        401
      );
    }

    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true, client: true, admin: true },
    });
    if (!user) return sendError(res, 'Account no longer exists.', 401);

    const token = await issueSession(req, user);
    setSessionCookie(res, token);
    const csrfToken = setCsrfCookie(res);
    return sendSuccess(res, { user: sanitizeUser(user), csrfToken });
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    console.error('Verify OTP error:', err);
    return sendError(res, 'Verification failed.', 500);
  }
};

// RESEND-OTP — issues a fresh code against the same pending login,
// invalidating the previous one (see issueLoginOtp).
export const resendOtp = async (req, res) => {
  try {
    const { otpToken } = req.body;
    if (!otpToken) return sendError(res, 'otpToken is required.', 400);

    const userId = verifyOtpToken(otpToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 'Account no longer exists.', 401);

    await issueLoginOtp(user);
    // Issue a fresh otpToken too — keeps the 5-minute window anchored to
    // the resend, not the original login, so a code sent now isn't
    // paired with a client-side token that's about to expire seconds later.
    return sendSuccess(res, {
      otpToken: signOtpToken(user),
      message: `We sent a new code to ${user.email}.`,
    });
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    console.error('Resend OTP error:', err);
    return sendError(res, 'Could not resend code.', 500);
  }
};

// LOGOUT — revoke current session
export const logout = async (req, res) => {
  try {
    if (req.sessionId) {
      await prisma.session.updateMany({
        where: { id: req.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookie(res);
    clearCsrfCookie(res);
    return sendSuccess(res, null, 200, 'Logged out');
  } catch (err) {
    console.error('Logout error:', err);
    return sendError(res, 'Logout failed.', 400);
  }
};

// LOGOUT-ALL — revoke all sessions for this user
export const logoutAll = async (req, res) => {
  try {
    await prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearSessionCookie(res);
    clearCsrfCookie(res);
    return sendSuccess(res, null, 200, 'Logged out of all devices');
  } catch (err) {
    console.error('Logout-all error:', err);
    return sendError(res, 'Logout failed.', 400);
  }
};
