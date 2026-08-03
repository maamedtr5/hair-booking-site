// src/auth/authMiddleware.js
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.jti) {
      const session = await prisma.session.findUnique({ where: { id: decoded.jti } });
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return res.status(401).json({ success: false, message: 'Session expired or revoked. Please log in again.' });
      }
    }

    req.user = decoded;
    req.sessionId = decoded.jti;
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};
