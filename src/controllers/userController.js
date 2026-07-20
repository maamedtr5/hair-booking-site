// src/controllers/userController.js
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError } from '../utils/response.js';

const stripPassword = (user) => {
  if (!user) return user;
  const { _password, ...safe } = user;
  return safe;
};

const isSelfOrStaff = (req, targetId) =>
  req.user.id === targetId || ['ADMIN', 'STAFF'].includes(req.user.role);

// Admin-only direct account creation. `role` is accepted here deliberately
// — this route is already gated to ADMIN by the router.
export async function createUserHandler(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role ?? 'CLIENT' },
    });
    return sendSuccess(res, stripPassword(user), 201, 'User created');
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'Email already in use', 409);
    return sendError(res, err.message, 400);
  }
}

export async function getUserHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!isSelfOrStaff(req, id)) return sendError(res, 'Forbidden', 403);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, stripPassword(user));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

// ADMIN/STAFF only (enforced at the route level) — lists everyone.
export async function getUsersHandler(req, res) {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;
    const users = await prisma.user.findMany({ skip, take });
    return sendSuccess(res, users.map(stripPassword));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

// Self or admin. Role is intentionally never accepted here — see
// updateUserRoleHandler for the only path that can change it.
export async function updateUserHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!isSelfOrStaff(req, id) || (req.user.id !== id && req.user.role !== 'ADMIN')) {
      // Staff can view others (getUserHandler) but only self/admin can edit.
      return sendError(res, 'Forbidden', 403);
    }

    const { name, email, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (password !== undefined) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id }, data });
    return sendSuccess(res, stripPassword(user));
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'Email already in use', 409);
    return sendError(res, err.message, 400);
  }
}

// ADMIN only (enforced at route level).
export async function updateUserRoleHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!['ADMIN', 'STAFF', 'CLIENT'].includes(role)) {
      return sendError(res, 'Invalid role', 400);
    }
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return sendSuccess(res, stripPassword(user), 200, 'Role updated');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

export async function deleteUserHandler(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { id } });
    return sendSuccess(res, null, 200, 'User deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

export const updateGoogleTokens = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.id !== id) return sendError(res, 'Forbidden', 403);

    const { googleAccessToken, googleRefreshToken, googleTokenExpiry } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        googleAccessToken,
        googleRefreshToken,
        googleTokenExpiry: googleTokenExpiry ? new Date(googleTokenExpiry) : null,
      },
    });
    return sendSuccess(res, stripPassword(updatedUser), 200, 'Google tokens updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const disconnectGoogleCalendar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.id !== id) return sendError(res, 'Forbidden', 403);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null },
    });
    return sendSuccess(res, stripPassword(updatedUser), 200, 'Google Calendar disconnected successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};