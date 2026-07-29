 // src/controllers/appointmentController.js
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../services/emailService.js';
import { sendAppointmentReminderSMS } from '../services/smsService.js';
import { resolveClientForRequest } from '../services/guestClientService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const FULL_INCLUDE = {
  service: true,
  staff: { include: { user: true } },
  booking: { include: { client: { include: { user: true } }, payment: true } },
};

// Appointments in these statuses no longer hold a real slot on the
// calendar, so they never count as a conflict for a new/rescheduled booking.
const NON_BLOCKING_STATUSES = ['CANCELLED', 'NO_SHOW'];

// Generous upper bound on how long any single service could ever run.
// Used only to keep the conflict-check query from scanning the entire
// appointment history for a staff member — actual overlap is still
// computed precisely from each candidate's real service.duration.
const MAX_SERVICE_DURATION_MINUTES = 8 * 60;

// Guards against double-booking a staff member. Without this, nothing
// stops two different requests (two different clients, or the same
// client double-submitting) from landing on the same staff member at
// overlapping times — the "available slots" endpoint only ever informed
// what the UI *displays*, it never gated what the write endpoints
// actually allowed onto the calendar.
//
// `tx` must be a Prisma transaction client running at Serializable
// isolation (see withConflictCheck below) so two concurrent requests
// racing for the same slot can't both pass this check before either
// commits.
async function assertSlotAvailable(tx, { staffId, start, end, excludeAppointmentId }) {
  if (!staffId) return; // No specific staff requested — nothing to conflict against.

  const lookbackStart = new Date(start.getTime() - MAX_SERVICE_DURATION_MINUTES * 60000);

  const candidates = await tx.appointment.findMany({
    where: {
      staffId,
      status: { notIn: NON_BLOCKING_STATUSES },
      date: { gte: lookbackStart, lt: end },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: { service: true },
  });

  const conflict = candidates.find((appt) => {
    const apptEnd = new Date(appt.date.getTime() + appt.service.duration * 60000);
    return apptEnd > start; // overlaps [start, end)
  });

  if (conflict) {
    const err = new Error(
      'This staff member already has an appointment during that time. Please choose a different time or staff member.'
    );
    err.status = 409;
    throw err;
  }
}

// Whether a specific staff member has no overlapping appointment during
// [start, end). claimAppointment uses this, inside a Serializable
// transaction, to make sure the staff member claiming a queued
// appointment is actually free at that time — someone's personal
// schedule can easily have moved since the appointment was booked.
async function isStaffFreeAt(tx, { staffId, start, end, excludeAppointmentId }) {
  try {
    await assertSlotAvailable(tx, { staffId, start, end, excludeAppointmentId });
    return true;
  } catch {
    return false;
  }
}

// Whether a specific staff member has no overlapping appointment during
// [start, end). claimAppointment uses this, inside a Serializable
// transaction, to make sure the staff member claiming a queued
// appointment is actually free at that time — someone's personal
// schedule can easily have moved since the appointment was booked.
async function isStaffFreeAt(tx, { staffId, start, end, excludeAppointmentId }) {
  try {
    await assertSlotAvailable(tx, { staffId, start, end, excludeAppointmentId });
    return true;
  } catch {
    return false;
  }
}

// Runs `work(tx)` inside a Serializable transaction, retrying once if
// Postgres reports a serialization conflict (Prisma error code P2034 —
// two concurrent transactions both tried to book the same slot). One
// retry is enough here: the loser simply re-checks availability against
// the now-committed winner and correctly fails with a 409 instead of
// silently double-booking.
async function withConflictCheck(work) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (err.code === 'P2034' && attempt < MAX_ATTEMPTS - 1) {
        // Small backoff so the winning transaction has time to actually
        // commit before we re-check — retrying instantly back-to-back
        // under real concurrent load just repeats the same race.
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      if (err.code === 'P2034') {
        // Retries exhausted under genuine concurrent load. This is a
        // "please try again", not a validation failure — surfacing it as
        // a bare 400 (the generic fallback below) reads as if the
        // request itself was malformed, which it wasn't.
        const retryErr = new Error('This slot is being booked by someone else right now. Please try again.');
        retryErr.status = 409;
        throw retryErr;
      }
      throw err;
    }
  }
}

// Validates a promo code the same way resolveBookingAmount will when the
// payment is quoted, so a client can never attach a code that's expired,
// deactivated, or doesn't exist — this runs inside the same transaction
// as the booking write so the check and the attach are atomic.
async function resolvePromocodeId(tx, promoCode) {
  if (!promoCode) return null;

  const code = String(promoCode).toUpperCase().trim();
  const promo = await tx.promocode.findUnique({ where: { code } });

  if (!promo) {
    const err = new Error('That promo code was not found.');
    err.status = 400;
    throw err;
  }

  const now = new Date();
  if (!promo.isActive || now < promo.validFrom || now > promo.validUntil) {
    const err = new Error('That promo code is not currently valid.');
    err.status = 400;
    throw err;
  }

  return promo.id;
}

// Book an appointment — open to guests and logged-in clients alike.
// Creates the Appointment + Booking together so the frontend only makes
// one call to "book now".
export const createAppointment = async (req, res) => {
  try {
    const { serviceId, staffId, date, notes, promoCode } = req.body;
    const { clientId, contactEmail, contactPhone, contactName } =
      await resolveClientForRequest(req);

    const result = await withConflictCheck(async (tx) => {
      const service = await tx.service.findUnique({ where: { id: parseInt(serviceId, 10) } });
      if (!service) {
        const err = new Error('Service not found');
        err.status = 404;
        throw err;
      }

      const start = new Date(date);
      const end = new Date(start.getTime() + service.duration * 60000);
      const staffIdInt = staffId ? parseInt(staffId, 10) : null;

      await assertSlotAvailable(tx, { staffId: staffIdInt, start, end });
      const promocodeId = await resolvePromocodeId(tx, promoCode);

      const appointment = await tx.appointment.create({
        data: {
          serviceId: parseInt(serviceId, 10),
          staffId: staffIdInt,
          date: start,
          notes: notes ?? null,
        },
      });
      await tx.booking.create({
        data: { appointmentId: appointment.id, clientId, promocodeId },
      });
      return tx.appointment.findUnique({
        where: { id: appointment.id },
        include: FULL_INCLUDE,
      });
    });

    // Don't fail the booking if the confirmation notification fails.
    sendEmail({
      to: contactEmail,
      template: 'appointmentConfirmation',
      data: {
        clientName: contactName,
        serviceName: result.service?.name,
        appointmentTime: result.date,
        staffName: result.staff?.user?.name,
      },
    }).catch((err) => console.error('Confirmation email failed:', err.message));

    if (contactPhone) {
      sendAppointmentReminderSMS({
        clientPhone: contactPhone,
        clientName: contactName,
        serviceName: result.service?.name,
        appointmentTime: result.date,
        staffName: result.staff?.user?.name,
      }).catch((err) => console.error('Confirmation SMS failed:', err.message));
    }

    return sendSuccess(
      res,
      { ...result, bookingReference: result.booking?.id },
      201,
      'Appointment booked'
    );
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }
};

// Guest-safe lookup: owner, staff/admin, or a matching ?email=. Appointment
// records carry the client's name/email/phone/notes, so — same as
// bookingController.getBooking — this must never be reachable by an
// arbitrary caller just because they know or can guess an id.
export const getAppointment = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: FULL_INCLUDE,
    });
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const ownerEmail = appointment.booking?.client?.user?.email;
    const isOwner = req.user && appointment.booking?.client?.userId === req.user.id;
    const isStaffOrAdmin = req.user && ['ADMIN', 'STAFF'].includes(req.user.role);
    const emailMatches =
      req.query.email && ownerEmail && req.query.email.toLowerCase() === ownerEmail.toLowerCase();

    if (!isOwner && !isStaffOrAdmin && !emailMatches) {
      return sendError(
        res,
        'Not authorized to view this appointment. Pass ?email= matching the booking contact email, or log in.',
        403
      );
    }

    return sendSuccess(res, appointment);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level) — this lists every appointment in the
// system, so unlike the single-record lookup above there's no guest/email
// fallback that makes sense here.
export const getAppointments = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    // NOTE: previously defaulted to take=10 with no pagination UI on the
    // admin/staff side to ever request more — the appointments list was
    // silently truncated to the 10 earliest-dated appointments for every
    // salon with more than 10 appointments total. Default to a high cap
    // instead; an explicit ?take= still works for anyone who wants real
    // pagination later.
    const take = parseInt(req.query.take, 10) || 2000;
    const appointments = await prisma.appointment.findMany({
      skip,
      take,
      include: FULL_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level).
export const updateAppointment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Whitelist exactly what this endpoint is allowed to touch. `data:
    // req.body` previously spread the raw request body straight into
    // Prisma — harmless with today's frontend callers, but a real
    // mass-assignment risk the moment any caller sends a wider payload
    // (e.g. a stray clientId, id, or createdAt tagging along on an
    // object built from the full row).
    const ALLOWED_FIELDS = ['serviceId', 'staffId', 'date', 'status', 'notes'];
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    // Internal callers (Google Calendar sync, reminder jobs) are allowed
    // to also touch these; validateAppointmentUpdate already rejects them
    // for anyone else.
    if (req.isInternalUpdate) {
      for (const field of ['googleEventId', 'reminderScheduled', 'reminderSent', 'reminderSentAt']) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      }
    }

    const previous = await prisma.appointment.findUnique({ where: { id } });

    const updated = await withConflictCheck(async (tx) => {
      // Only re-check availability if this update actually touches the
      // time or the assigned staff member — a status/notes-only edit
      // shouldn't pay the conflict-check cost or risk a false 409.
      if (updateData.date || updateData.staffId !== undefined) {
        const existing = await tx.appointment.findUnique({
          where: { id },
          include: { service: true },
        });
        if (!existing) {
          const err = new Error('Appointment not found');
          err.status = 404;
          throw err;
        }

        const staffId =
          updateData.staffId !== undefined
            ? updateData.staffId
              ? parseInt(updateData.staffId, 10)
              : null
            : existing.staffId;
        const start = updateData.date ? new Date(updateData.date) : existing.date;
        const end = new Date(start.getTime() + existing.service.duration * 60000);

        await assertSlotAvailable(tx, { staffId, start, end, excludeAppointmentId: id });
      }

      // Confirming a "no preference" booking no longer force-assigns a
      // stylist — see claimAppointment below. It's left unassigned here;
      // the notification fan-out after the transaction is what puts it
      // in front of staff as something claimable.

      return tx.appointment.update({
        where: { id },
        data: updateData,
        include: FULL_INCLUDE,
      });
    });

    // Fire a client-facing notification whenever the status actually
    // changed — this is what feeds the notification bell. Best-effort:
    // a notification failure should never fail the underlying status
    // update, which is why this is fire-and-forget with its own catch.
    const clientUserId = updated.booking?.client?.userId;
    if (updateData.status && updateData.status !== previous?.status && clientUserId) {
      const STATUS_MESSAGES = {
        CONFIRMED: 'Your appointment has been confirmed.',
        COMPLETED: 'Your appointment is marked complete. Thank you for choosing Locs Allure!',
        CANCELLED: 'Your appointment has been cancelled.',
      };
      const message = STATUS_MESSAGES[updateData.status];
      if (message) {
        prisma.notification.create({
          data: {
            userId: clientUserId,
            message,
            type: 'APPOINTMENT',
          },
        }).catch((err) => console.error('Notification create failed:', err));
      }
    }

    // A confirmed, still-unassigned appointment just became claimable —
    // let every staff member know rather than relying on them to check
    // the queue page. Best-effort/fire-and-forget for the same reason
    // as above: a notification hiccup must never fail the confirmation.
    if (updateData.status === 'CONFIRMED' && previous && previous.staffId == null && updated.staffId == null) {
      prisma.staff.findMany({ select: { userId: true } })
        .then((staffRows) => {
          if (staffRows.length === 0) return;
          const when = updated.date.toLocaleString('en-GH', {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return prisma.notification.createMany({
            data: staffRows.map((s) => ({
              userId: s.userId,
              message: `New appointment available to claim: ${updated.service?.name ?? 'a service'} on ${when}.`,
              type: 'APPOINTMENT',
            })),
          });
        })
        .catch((err) => console.error('Queue notification fan-out failed:', err));
    }

    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }
};

// Staff/admin only. The "available to claim" queue: confirmed
// appointments with no staff preference/assignment yet, upcoming only
// (a queued appointment in the past is just a data artifact, not
// something anyone should be claiming). Any staff member can see the
// whole queue — claimAppointment is what actually gates who can take
// one, based on whether it fits their own schedule.
export const getUnclaimedAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        staffId: null,
        date: { gte: new Date() },
      },
      include: FULL_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff self-service pickup — "the moment someone's free, they can take
// it up if they feel up to it on their schedule" instead of the system
// (or an admin) assigning it for them. Runs inside the same Serializable
// transaction machinery as everything else that touches a slot, so two
// staff members claiming the same appointment at the same instant can't
// both win — the loser gets a clean "someone already claimed this"
// instead of silently overwriting the winner's assignment.
export const claimAppointment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const staffRecord = await prisma.staff.findUnique({ where: { userId: req.user.id } });
    if (!staffRecord) {
      return sendError(res, 'Only staff members can claim appointments.', 403);
    }

    const updated = await withConflictCheck(async (tx) => {
      // Re-read inside the transaction — this is the check that actually
      // prevents a double-claim race, not the one in the queue list.
      const existing = await tx.appointment.findUnique({
        where: { id },
        include: { service: true },
      });
      if (!existing) {
        const err = new Error('Appointment not found');
        err.status = 404;
        throw err;
      }
      if (existing.status !== 'CONFIRMED') {
        const err = new Error('Only confirmed appointments can be claimed.');
        err.status = 400;
        throw err;
      }
      if (existing.staffId != null) {
        const err = new Error('Someone else already claimed this appointment.');
        err.status = 409;
        throw err;
      }

      const end = new Date(existing.date.getTime() + existing.service.duration * 60000);
      const free = await isStaffFreeAt(tx, {
        staffId: staffRecord.id,
        start: existing.date,
        end,
        excludeAppointmentId: id,
      });
      if (!free) {
        const err = new Error("You already have an appointment that overlaps this time.");
        err.status = 409;
        throw err;
      }

      return tx.appointment.update({
        where: { id },
        data: { staffId: staffRecord.id },
        include: FULL_INCLUDE,
      });
    });

    // Let the client know a stylist is now on their appointment.
    const clientUserId = updated.booking?.client?.userId;
    if (clientUserId) {
      prisma.notification.create({
        data: {
          userId: clientUserId,
          message: `${updated.staff?.user?.name ?? 'A stylist'} has been assigned to your appointment.`,
          type: 'APPOINTMENT',
        },
      }).catch((err) => console.error('Notification create failed:', err));
    }

    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }
};

// Staff/admin only. Soft-cancels rather than hard-deleting so revenue
// reporting and history stay intact — a hard delete would also violate
// the Booking→Appointment foreign key if a booking exists.
//
// If the booking had already been paid (Payment.status === SUCCESS),
// cancelling it now flips the payment to REFUND_PENDING instead of
// leaving it looking like an untouched successful charge. This doesn't
// process a refund automatically (that's a Paystack/MoMo operation with
// real money and needs a human decision) — it just makes sure "this
// client paid and then the booking was cancelled" is impossible to miss
// in the payments list instead of silently falling through the cracks.
export const deleteAppointment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: FULL_INCLUDE,
      });
      if (appointment.booking) {
        await tx.booking.update({
          where: { id: appointment.booking.id },
          data: { status: 'CANCELLED' },
        });
        if (appointment.booking.payment?.status === 'SUCCESS') {
          await tx.payment.update({
            where: { id: appointment.booking.payment.id },
            data: { status: 'REFUND_PENDING' },
          });
        }
      }
      return appointment;
    });
    return sendSuccess(res, result, 200, 'Appointment cancelled');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only. Marks a client as having not shown up — kept
// separate from CANCELLED so reporting can tell the difference, and
// deliberately does NOT touch the payment: a no-show is the scenario
// where a deposit is typically forfeited rather than refunded, so unlike
// deleteAppointment above, no REFUND_PENDING flag is set here. If your
// policy is ever to refund no-shows too, that decision belongs here.
export const markAppointmentNoShow = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: { id },
        data: { status: 'NO_SHOW' },
        include: FULL_INCLUDE,
      });
      if (appointment.booking) {
        await tx.booking.update({
          where: { id: appointment.booking.id },
          data: { status: 'COMPLETED' }, // the appointment slot has passed either way
        });
      }
      return appointment;
    });
    return sendSuccess(res, result, 200, 'Appointment marked as no-show');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level) — clients hit /appointments/client/:clientId
// while authenticated, and the check below still confirms they own that
// clientId even though the route already requires a valid session.
export const getAppointmentsByClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      // Clients may only fetch their own history.
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client || client.userId !== req.user.id) return sendError(res, 'Forbidden', 403);
    }
    const appointments = await prisma.appointment.findMany({
      where: { booking: { clientId } },
      include: FULL_INCLUDE,
      orderBy: { date: 'desc' },
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level) — returns every appointment for a staff
// member, including client PII, so this must not be publicly reachable.
export const getAppointmentsByStaff = async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId, 10);
    const appointments = await prisma.appointment.findMany({
      where: { staffId },
      include: FULL_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level).
export const getAppointmentsByDate = async (req, res) => {
  try {
    const start = new Date(req.params.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const appointments = await prisma.appointment.findMany({
      where: { date: { gte: start, lt: end } },
      include: FULL_INCLUDE,
      orderBy: { date: 'asc' },
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level).
export const getAppointmentsByStatus = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { status: req.params.status.toUpperCase() },
      include: FULL_INCLUDE,
    });
    return sendSuccess(res, appointments);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only (route-level).
export const bulkCancelAppointments = async (req, res) => {
  try {
    const { appointmentIds } = req.body;
    const cancelled = await prisma.$transaction(async (tx) => {
      const toCancel = await tx.appointment.findMany({
        where: { id: { in: appointmentIds } },
        include: FULL_INCLUDE,
      });

      await tx.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { status: 'CANCELLED' },
      });
      await tx.booking.updateMany({
        where: { appointmentId: { in: appointmentIds } },
        data: { status: 'CANCELLED' },
      });

      // Same refund-flagging as the single-cancel path — anything that
      // was already SUCCESS-paid needs to surface as REFUND_PENDING
      // instead of silently staying "paid" after the booking is gone.
      const paidPaymentIds = toCancel
        .filter((appt) => appt.booking?.payment?.status === 'SUCCESS')
        .map((appt) => appt.booking.payment.id);
      if (paidPaymentIds.length > 0) {
        await tx.payment.updateMany({
          where: { id: { in: paidPaymentIds } },
          data: { status: 'REFUND_PENDING' },
        });
      }

      return toCancel;
    });

    for (const appt of cancelled) {
      const client = appt.booking?.client;
      if (client?.user?.email) {
        sendEmail({
          to: client.user.email,
          template: 'appointmentCancelled',
          data: {
            clientName: client.user.name,
            serviceName: appt.service?.name,
            appointmentTime: appt.date,
            staffName: appt.staff?.user?.name,
          },
        }).catch((err) => console.error('Cancellation email failed:', err.message));
      }
    }

    return sendSuccess(res, { count: appointmentIds.length }, 200, 'Appointments cancelled and clients notified');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Guests may reschedule their own appointment via ?email= matching the
// booking's contact email; logged-in users need to own it or be staff/admin.
export const rescheduleAppointment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { newDate } = req.body;

    const updated = await withConflictCheck(async (tx) => {
      const existing = await tx.appointment.findUnique({ where: { id }, include: FULL_INCLUDE });
      if (!existing) {
        const err = new Error('Appointment not found');
        err.status = 404;
        throw err;
      }

      const ownerEmail = existing.booking?.client?.user?.email;
      const isOwner = req.user && existing.booking?.client?.userId === req.user.id;
      const isStaffOrAdmin = req.user && ['ADMIN', 'STAFF'].includes(req.user.role);
      const emailMatches =
        req.body.email && ownerEmail && req.body.email.toLowerCase() === ownerEmail.toLowerCase();

      if (!isOwner && !isStaffOrAdmin && !emailMatches) {
        const err = new Error('Not authorized to reschedule this appointment');
        err.status = 403;
        throw err;
      }

      const start = new Date(newDate);
      const end = new Date(start.getTime() + existing.service.duration * 60000);
      await assertSlotAvailable(tx, { staffId: existing.staffId, start, end, excludeAppointmentId: id });

      return tx.appointment.update({
        where: { id },
        data: { date: start, status: 'RESCHEDULED' },
        include: FULL_INCLUDE,
      });
    });

    const client = updated.booking?.client;
    if (client?.user?.email) {
      sendEmail({
        to: client.user.email,
        template: 'appointmentRescheduled',
        data: {
          clientName: client.user.name,
          serviceName: updated.service?.name,
          appointmentTime: updated.date,
          staffName: updated.staff?.user?.name,
        },
      }).catch((err) => console.error('Reschedule email failed:', err.message));
    }

    return sendSuccess(res, updated, 200, 'Appointment rescheduled');
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }
};

// ADMIN only. NOTE: calendar resync against googleCalendarService is
// left as a TODO — it needs a product decision on whose connected
// calendar an admin-created event syncs to. Reminder scheduling is
// wired to the real reminderJobs export names (the previous version
// referenced functions that didn't exist).
export const internalUpdateAppointment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await prisma.appointment.update({
      where: { id },
      data: req.body,
      include: FULL_INCLUDE,
    });

    if (req.body.date) {
      const { scheduleAppointmentReminder: scheduleReminder } = await import('../jobs/reminderJobs.js');
      await scheduleReminder(updated.id).catch((err) =>
        console.error('Reminder reschedule failed:', err.message)
      );
    }
    // TODO: Google Calendar resync — see checklist item "reminder-wiring-bug".

    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const scheduleAppointmentReminder = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const { scheduleAppointmentReminder: scheduleReminder } = await import('../jobs/reminderJobs.js');
    await scheduleReminder(appointment.id);
    await prisma.appointment.update({ where: { id }, data: { reminderScheduled: true } });

    return sendSuccess(res, { appointmentId: appointment.id }, 200, 'Reminder scheduled successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const cancelAppointmentReminder = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { cancelAppointmentReminder: cancelReminder } = await import('../jobs/reminderJobs.js');
    await cancelReminder(id);
    await prisma.appointment.update({ where: { id }, data: { reminderScheduled: false } });

    return sendSuccess(res, { appointmentId: id }, 200, 'Reminder cancelled successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getQueueStats = async (req, res) => {
  try {
    const { getQueueStats: fetchStats } = await import('../jobs/reminderJobs.js');
    const stats = await fetchStats();
    return sendSuccess(res, stats);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};