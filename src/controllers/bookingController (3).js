// src/controllers/bookingController.js
import { prisma } from '../lib/prisma.js'; // was missing — GET /bookings 500'd on every call
import bookingModel from '../models/booking.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
function sanitizeBooking(booking) {
  if (!booking) return null;
  const safe = { ...booking };
  if (safe.client?.user?.password) {
    const { password, ...safeUser } = safe.client.user;
    safe.client = { ...safe.client, user: safeUser };
  }
  if (safe.user?.password) {
    const { password, ...safeUser } = safe.user;
    safe.user = safeUser;
  }
  return safe;
}

// Staff/admin only (route-level) — manual booking for an existing appointment.
// Only these are validated by validateBookingCreate — anything else in
// the body must not reach Prisma. `data: req.body` previously spread the
// raw payload straight into `booking.create`, which was harmless with
// today's frontend caller but a real mass-assignment risk the moment any
// other field (e.g. a stray id/createdAt) tags along on the object.
const CREATE_ALLOWED_FIELDS = ['appointmentId', 'clientId', 'userId', 'promocodeId', 'status'];

export const createBooking = async (req, res) => {
  try {
    const data = {};
    for (const field of CREATE_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const booking = await bookingModel.createBooking(data);
    return sendSuccess(res, sanitizeBooking(booking), 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Guest-safe lookup: owner, staff/admin, or a matching ?email=.
export const getBooking = async (req, res) => {
  try {
    const booking = await bookingModel.getBookingById(parseInt(req.params.id, 10));
    if (!booking) return sendError(res, 'Booking not found', 404);

    const ownerEmail = booking.client?.user?.email;
    const isOwner = req.user && booking.client?.userId === req.user.id;
    const isStaffOrAdmin = req.user && ['ADMIN', 'STAFF'].includes(req.user.role);
    const emailMatches =
      req.query.email && ownerEmail && req.query.email.toLowerCase() === ownerEmail.toLowerCase();

    if (!isOwner && !isStaffOrAdmin && !emailMatches) {
      return sendError(
        res,
        'Not authorized to view this booking. Pass ?email= matching the booking contact email, or log in.',
        403
      );
    }

    return sendSuccess(res, sanitizeBooking(booking));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Staff/admin only (route-level).
export const getBookings = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 1000;
    const bookings = await prisma.booking.findMany({
      skip,
      take,
      include: { client: { include: { user: true } }, appointment: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, bookings.map(sanitizeBooking));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

const UPDATE_ALLOWED_FIELDS = ['status', 'promocodeId'];

export const updateBooking = async (req, res) => {
  try {
    const data = {};
    for (const field of UPDATE_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const booking = await bookingModel.updateBooking(parseInt(req.params.id, 10), data);
    return sendSuccess(res, sanitizeBooking(booking));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const deleteBooking = async (req, res) => {
  try {
    await bookingModel.deleteBooking(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 200, 'Booking deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};