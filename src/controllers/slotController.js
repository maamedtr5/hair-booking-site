// src/controllers/slotController.js
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { computeAvailableSlots } from '../utils/availability.js';

// Utility: sanitize nested appointment/client data
function sanitizeSlot(slot) {
  if (!slot) return null;
  const safeSlot = { ...slot };

  if (safeSlot.appointment?.client?.password) {
    const { password, ...safeClient } = safeSlot.appointment.client;
    safeSlot.appointment.client = safeClient;
  }
  if (safeSlot.appointment?.user?.password) {
    const { password, ...safeUser } = safeSlot.appointment.user;
    safeSlot.appointment.user = safeUser;
  }

  return safeSlot;
}

// Create Slot
export const createSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.create({ data: req.body });
    return sendSuccess(res, sanitizeSlot(slot), 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all Slots (with skip/take pagination)
export const getSlots = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const slots = await prisma.slot.findMany({
      skip,
      take,
      include: {
        appointment: {
          include: { client: true, user: true }
        }
      },
      orderBy: { startTime: 'asc' } // optional: order by start time
    });

    return sendSuccess(res, slots.map(sanitizeSlot));
  } catch (err) {
    console.error('Error fetching slots:', err);
    return sendError(res, 'Failed to fetch slots. Please try again later.', 500);
  }
};

// Get Slot by ID
export const getSlotById = async (req, res) => {
  try {
    const slot = await prisma.slot.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { appointment: { include: { client: true, user: true } } }
    });
    if (!slot) {
      return sendError(res, 'Slot not found', 404);
    }
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Update Slot
export const updateSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { appointment: { include: { client: true, user: true } } }
    });
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Delete Slot
export const deleteSlot = async (req, res) => {
  try {
    await prisma.slot.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 200, 'Slot deleted');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Get available (bookable) times for a given date, optionally for a
// specific staff member. There is no table of pre-made "open" slots to
// query — Slot rows only ever represent a confirmed appointment's time
// block (appointmentId is required, not nullable) — so availability is
// computed from business hours minus existing appointments for that day.
export const getAvailableSlots = async (req, res) => {
  try {
    const { date, duration } = req.query;
    const requestedStaffId = req.query.staffId ? parseInt(req.query.staffId, 10) : null;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendError(res, 'A valid date (YYYY-MM-DD) is required', 400);
    }

    const durationMinutes = parseInt(duration, 10) || 60;

    let staffIds;
    if (requestedStaffId) {
      const staff = await prisma.staff.findUnique({ where: { id: requestedStaffId } });
      if (!staff) return sendError(res, 'Staff member not found', 404);
      staffIds = [requestedStaffId];
    } else {
      // "No preference" — a time is available if ANY staff member is free.
      const allStaff = await prisma.staff.findMany({ select: { id: true } });
      staffIds = allStaff.map((s) => s.id);
    }

    if (staffIds.length === 0) {
      return sendSuccess(res, []);
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      include: { service: true },
    });

    const busyByStaff = {};
    for (const id of staffIds) busyByStaff[id] = [];
    for (const appt of appointments) {
      if (appt.staffId == null) continue;
      const start = new Date(appt.date);
      const end = new Date(start.getTime() + (appt.service?.duration ?? 60) * 60000);
      if (!busyByStaff[appt.staffId]) busyByStaff[appt.staffId] = [];
      busyByStaff[appt.staffId].push([start, end]);
    }

    const computed = computeAvailableSlots({
      dateStr: date,
      staffIds,
      busyByStaff,
      durationMinutes,
    });

    // Shaped to match the frontend's Slot type (id/appointmentId aren't
    // meaningful for a not-yet-booked time, so they're placeholders — the
    // booking flow only reads startTime/endTime/isBooked from these).
    const slots = computed.map((s, idx) => ({
      id: -(idx + 1),
      appointmentId: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      isBooked: false,
      availableStaffIds: s.availableStaffIds,
    }));

    return sendSuccess(res, slots);
  } catch (err) {
    console.error('Error computing available slots:', err);
    return sendError(res, 'Failed to compute availability. Please try again later.', 500);
  }
};
