// src/controllers/bookingController.js
import { prisma } from '../lib/prisma.js'; // was missing — GET /bookings 500'd on every call
import bookingModel from '../models/booking.js';
import { sendSuccess, sendError } from '../utils/response.js';

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
export const createBooking = async (req, res) => {
  try {
    const booking = await bookingModel.createBooking(req.body);
    return sendSuccess(res, sanitizeBooking(booking), 201);
  } catch (err) {
    return sendError(res, err.message, 400);
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
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level).
export const getBookings = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;
    const bookings = await prisma.booking.findMany({
      skip,
      take,
      include: { client: { include: { user: true } }, appointment: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, bookings.map(sanitizeBooking));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await bookingModel.updateBooking(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, sanitizeBooking(booking));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const deleteBooking = async (req, res) => {
  try {
    await bookingModel.deleteBooking(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 200, 'Booking deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};