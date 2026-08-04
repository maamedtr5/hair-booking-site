// src/utils/capacity.js
//
// Shared "how many stylists could actually cover this window" logic.
//
// Background: a client booking with a specific stylist is already safely
// gated by assertSlotAvailable in appointmentController.js. But a "no
// preference" booking (staffId null) was never checked against anything —
// two different clients could both book overlapping "no preference"
// appointments when only one stylist total is free for that window, and
// only one of them could ever actually be claimed/serviced. This module
// closes that gap:
//
//   1. hasStylistCapacity — at booking time, is there actually a stylist
//      who isn't already provably committed elsewhere during this window?
//   2. promoteWaitlistedAppointments — whenever an appointment stops
//      holding a seat (cancelled, no-showed, rescheduled off the window),
//      check whether any WAITLISTED request can now be promoted into a
//      real, claimable appointment.
//
// Model: every stylist can perform every service — there's no
// staff-service eligibility mapping anywhere else in this codebase, so
// capacity is just "how many stylists exist" vs "how many are spoken for".
// A stylist is "used" by a window if a specific appointment is assigned to
// them. An *unassigned* overlapping appointment (staffId null, already
// past this same check once) also reserves one generic seat — without
// counting it, two "no preference" bookings could both be accepted for a
// window only one stylist can actually cover.

// Statuses that no longer hold a real seat on the calendar. Mirrors (and
// is the single source of truth for) what appointmentController.js's
// assertSlotAvailable treats as non-blocking.
export const NON_BLOCKING_STATUSES = ['CANCELLED', 'NO_SHOW', 'WAITLISTED'];

// Generous upper bound on how long any single service could ever run —
// keeps the lookback query from scanning the entire appointment history.
const MAX_SERVICE_DURATION_MINUTES = 8 * 60;

async function overlappingAppointments(tx, { start, end, excludeAppointmentId }) {
  const lookbackStart = new Date(start.getTime() - MAX_SERVICE_DURATION_MINUTES * 60000);

  const candidates = await tx.appointment.findMany({
    where: {
      status: { notIn: NON_BLOCKING_STATUSES },
      date: { gte: lookbackStart, lt: end },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: { service: true },
  });

  return candidates.filter((appt) => {
    const apptEnd = new Date(appt.date.getTime() + appt.service.duration * 60000);
    return apptEnd > start; // overlaps [start, end)
  });
}

// True if at least one stylist is not provably committed elsewhere during
// [start, end). Must run inside a Serializable transaction (see
// withConflictCheck in appointmentController.js) so two concurrent "no
// preference" bookings racing for the last open seat can't both pass.
export async function hasStylistCapacity(tx, { start, end, excludeAppointmentId }) {
  const totalStaff = await tx.staff.count();
  if (totalStaff === 0) return false;

  const overlapping = await overlappingAppointments(tx, { start, end, excludeAppointmentId });

  const busyStaffIds = new Set(
    overlapping.filter((a) => a.staffId != null).map((a) => a.staffId)
  );
  const unassignedReserved = overlapping.filter((a) => a.staffId == null).length;

  const seatsUsed = busyStaffIds.size + unassignedReserved;
  return seatsUsed < totalStaff;
}

// Scans future WAITLISTED appointments, oldest request first (id order ==
// request order — Appointment has no createdAt field), and promotes any
// whose own window now has capacity back to PENDING — the same state a
// fresh "no preference" booking starts in, so it flows through the normal
// confirm → claim pipeline from there.
//
// Deliberately re-checks capacity per waitlisted appointment rather than
// just the one freed window: a single cancellation can only ever free one
// seat, so at most one waitlisted request should be promoted per call, but
// scanning in request order guarantees it's the right (oldest) one.
//
// Call inside the same Serializable transaction as whatever action freed
// the capacity, so a concurrent new booking can't grab the freed seat out
// from under a waitlisted client who was there first.
export async function promoteWaitlistedAppointments(tx) {
  const now = new Date();
  const waitlisted = await tx.appointment.findMany({
    where: { status: 'WAITLISTED', date: { gte: now } },
    include: {
      service: true,
      staff: { include: { user: true } },
      booking: { include: { client: { include: { user: true } } } },
    },
    orderBy: { id: 'asc' },
  });

  const promoted = [];
  for (const appt of waitlisted) {
    const start = appt.date;
    const end = new Date(start.getTime() + appt.service.duration * 60000);
    const capacityAvailable = await hasStylistCapacity(tx, {
      start,
      end,
      excludeAppointmentId: appt.id,
    });
    if (!capacityAvailable) continue;

    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: { status: 'PENDING' },
    });
    promoted.push({ ...updated, service: appt.service, staff: appt.staff, booking: appt.booking });
  }
  return promoted;
}
