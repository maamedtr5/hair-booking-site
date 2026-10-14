// src/controllers/staffController.js
import { prisma } from '../lib/prisma.js';
import {
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from '../models/staff.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
//   Create new staff
export const createStaffHandler = async (req, res) => {
  try {
    const staff = await createStaff(req.body);
    return sendSuccess(res, staff, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get single staff by ID
// What the public booking page needs to show a stylist: name + bio. The
// public endpoints used to return `user: true` — the whole User row (email,
// role, Google tokens) — and, for the single-staff lookup, EVERY appointment
// (with notes) and review that stylist has. Anonymous callers and clients now
// get only this allow-list; staff/admin keep the full record.
const PUBLIC_STAFF_SELECT = {
  id: true,
  userId: true,
  bio: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
};

const isStaffOrAdminRequest = (req) =>
  ['ADMIN', 'STAFF'].includes(String(req.user?.role || '').toUpperCase());

export const getStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id, 10);
    if (!Number.isInteger(staffId) || staffId < 1) {
      return sendError(res, 'Invalid staff ID', 400);
    }

    const staff = isStaffOrAdminRequest(req)
      ? await getStaffById(staffId)
      : await prisma.staff.findUnique({ where: { id: staffId }, select: PUBLIC_STAFF_SELECT });

    if (!staff) {
      return sendError(res, 'Staff not found', 404);
    }

    return sendSuccess(res, staff);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all staff (with skip/take pagination)
export const getStaffsHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const query = { skip, take, orderBy: { createdAt: 'desc' } };
    const staff = await prisma.staff.findMany(
      isStaffOrAdminRequest(req) ? { ...query, include: { user: true } } : { ...query, select: PUBLIC_STAFF_SELECT },
    );

    return sendSuccess(res, staff);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Update staff by ID
export const updateStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    const updated = await updateStaff(staffId, req.body);
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Delete staff by ID
export const deleteStaffHandler = async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    await deleteStaff(staffId);
    return sendSuccess(res, null, 200, 'Staff deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};
