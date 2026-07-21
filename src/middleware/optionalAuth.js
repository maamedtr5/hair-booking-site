// src/middleware/optionalAuth.js
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.jti) {
      const session = await prisma.session.findUnique({ where: { id: decoded.jti } });
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return next(); // stale/revoked token on an optional route — proceed as guest
      }
    }
    req.user = decoded;
    req.sessionId = decoded.jti;
  } catch {
    // invalid/expired token — proceed as guest, don't block
  }
  next();
};