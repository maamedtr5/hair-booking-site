// src/auth/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js'; // shared singleton

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
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
      return res.status(400).json({
        error: 'Name is required and must be at least 2 characters long.',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists. Please use another email.' });
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

    const token = generateToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    return res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// LOGOUT — revoke current session
export const logout = async (req, res) => {
  try {
    if (req.sessionId) {
      await prisma.session.update({
        where: { id: req.sessionId },
        data: { revokedAt: new Date() },
      });
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// LOGOUT-ALL — revoke all sessions for this user
export const logoutAll = async (req, res) => {
  try {
    await prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.json({ message: 'Logged out of all devices' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
