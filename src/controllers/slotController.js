// src/controllers/slotController.js
import { prisma } from '../lib/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { computeAvailableSlots } from '../utils/availability.js';
import { getBusinessHoursConfig, getDayBounds } from '../utils/businessHours.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
// Slot -> Appointment -> Booking -> Client -> User is the real relation
// chain (Appointment has no direct `client`/`user` field). The previous
// version included `appointment: { client: true, user: true }`, which
// doesn't exist on the Appointment model at all — every call to
// createSlot/getSlots/getSlotById/updateSlot was throwing a Prisma
// "unknown field" error and 500ing unconditionally.
const SLOT_INCLUDE = {
  appointment: {
    include: {
      service: true,
      booking: { include: { client: { include: { user: true } } } },
    },
  },
};

// stripPasswords() in sendSuccess already strips any nested password hash
// centrally, so this no longer needs to do it manually — kept as a no-op
// passthrough so call sites below don't need to change shape.
function sanitizeSlot(slot) {
  return slot;
}

// Create Slot
export const createSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.create({ data: req.body, include: SLOT_INCLUDE });
    return sendSuccess(res, sanitizeSlot(slot), 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all Slots (with skip/take pagination)
export const getSlots = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const slots = await prisma.slot.findMany({
      skip,
      take,
      include: SLOT_INCLUDE,
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
      include: SLOT_INCLUDE,
    });
    if (!slot) {
      return sendError(res, 'Slot not found', 404);
    }
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Update Slot
export const updateSlot = async (req, res) => {
  try {
    const slot = await prisma.slot.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: SLOT_INCLUDE,
    });
    return sendSuccess(res, sanitizeSlot(slot));
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

// Delete Slot
export const deleteSlot = async (req, res) => {
  try {
    await prisma.slot.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 200, 'Slot deleted');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
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

    const hoursConfig = await getBusinessHoursConfig();
    const [y, m, d] = date.split('-').map(Number);
    const dayBounds = getDayBounds(new Date(y, m - 1, d).getDay(), hoursConfig);
    if (!dayBounds) {
      return sendSuccess(res, []); // salon closed that day
    }

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

    // Appointments that no longer hold a real slot (cancelled / no-show)
    // must not block the time from being offered again.
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
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
      dayBounds,
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

// Get a whole month's day-by-day status in one call: 'closed' (salon shut
// that weekday), 'full' (open, but every staff member is booked solid),
// or 'available' (at least one bookable slot exists). Lets the booking
// calendar fade out closed/fully-booked days before the client ever
// clicks into one, instead of them discovering it one day at a time.
//
// Reuses the exact same computeAvailableSlots() the single-day endpoint
// uses (rather than a separate hand-rolled check) so this can never drift
// out of sync with what /available actually returns for a given day.
export const getMonthAvailability = async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10); // 1-12
    if (!y || !m || m < 1 || m > 12) {
      return sendError(res, 'A valid year and month (1-12) are required', 400);
    }

    const requestedStaffId = req.query.staffId ? parseInt(req.query.staffId, 10) : null;
    const durationMinutes = parseInt(req.query.duration, 10) || 60;
    const hoursConfig = await getBusinessHoursConfig();

    let staffIds;
    if (requestedStaffId) {
      const staff = await prisma.staff.findUnique({ where: { id: requestedStaffId } });
      if (!staff) return sendError(res, 'Staff member not found', 404);
      staffIds = [requestedStaffId];
    } else {
      const allStaff = await prisma.staff.findMany({ select: { id: true } });
      staffIds = allStaff.map((s) => s.id);
    }

    const daysInMonth = new Date(y, m, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStrFor = (d) => `${y}-${pad(m)}-${pad(d)}`;

    // No stylists exist at all — nothing is ever bookable, no point
    // running a query.
    if (staffIds.length === 0) {
      const summary = {};
      for (let d = 1; d <= daysInMonth; d++) summary[dateStrFor(d)] = 'full';
      return sendSuccess(res, summary);
    }

    // One query across the whole month, not one per day — a month view
    // only needs "is at least one slot free that day", so this stays
    // cheap regardless of how many days are in the grid.
    const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(y, m - 1, daysInMonth, 23, 59, 59, 999);
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        date: { gte: monthStart, lte: monthEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: { service: true },
    });

    const busyByDay = {}; // dateStr -> { staffId: [[start,end], ...] }
    for (const appt of appointments) {
      if (appt.staffId == null) continue;
      const start = new Date(appt.date);
      const end = new Date(start.getTime() + (appt.service?.duration ?? 60) * 60000);
      const dateStr = dateStrFor(start.getDate());
      if (!busyByDay[dateStr]) busyByDay[dateStr] = {};
      if (!busyByDay[dateStr][appt.staffId]) busyByDay[dateStr][appt.staffId] = [];
      busyByDay[dateStr][appt.staffId].push([start, end]);
    }

    const now = new Date();
    const summary = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dateStrFor(d);
      const dayBounds = getDayBounds(new Date(y, m - 1, d).getDay(), hoursConfig);

      if (!dayBounds) {
        summary[dateStr] = 'closed';
        continue;
      }

      const busyByStaff = busyByDay[dateStr] || {};
      for (const id of staffIds) if (!busyByStaff[id]) busyByStaff[id] = [];

      const computed = computeAvailableSlots({
        dateStr, staffIds, busyByStaff, durationMinutes, dayBounds, now,
      });

      summary[dateStr] = computed.length > 0 ? 'available' : 'full';
    }

    return sendSuccess(res, summary);
  } catch (err) {
    console.error('Error computing month availability:', err);
    return sendError(res, 'Failed to compute availability. Please try again later.', 500);
  }
};