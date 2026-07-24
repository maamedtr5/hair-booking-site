// src/auth/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js'; // shared singleton
import { sendSuccess, sendError } from '../utils/response.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

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
    return sendSuccess(res, { user: sanitizeUser(user), token }, 201);
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
      where: { email: email.toLowerCase() },
      include: { staff: true, client: true, admin: true },
    });
    if (!user) return sendError(res, 'Invalid credentials', 401);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return sendError(res, 'Invalid credentials', 401);

    const token = await issueSession(req, user);
    return sendSuccess(res, { user: sanitizeUser(user), token });
  } catch (err) {
    console.error('Login error:', err);
    return sendError(res, 'Login failed.', 500);
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
    return sendSuccess(res, null, 200, 'Logged out of all devices');
  } catch (err) {
    console.error('Logout-all error:', err);
    return sendError(res, 'Logout failed.', 400);
  }
};
