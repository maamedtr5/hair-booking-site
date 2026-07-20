// src/controllers/appointmentController.js
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../services/emailService.js';
import { sendAppointmentReminderSMS } from '../services/smsService.js';
import { resolveClientForRequest } from '../services/guestClientService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const FULL_INCLUDE = {
  service: true,
  staff: { include: { user: true } },
  booking: { include: { client: { include: { user: true } } } },
};

// Book an appointment — open to guests and logged-in clients alike.
// Creates the Appointment + Booking together so the frontend only makes
// one call to "book now".
export const createAppointment = async (req, res) => {
  try {
    const { serviceId, staffId, date, notes } = req.body;
    const { clientId, contactEmail, contactPhone, contactName } =
      await resolveClientForRequest(req);

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          serviceId: parseInt(serviceId, 10),
          staffId: staffId ? parseInt(staffId, 10) : null,
          date: new Date(date),
          notes: notes ?? null,
        },
      });
      await tx.booking.create({
        data: { appointmentId: appointment.id, clientId },
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

export const getAppointment = async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: FULL_INCLUDE,
    });
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, appointment);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getAppointments = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const take = parseInt(req.query.take, 10) || 10;
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
    const updated = await prisma.appointment.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
      include: FULL_INCLUDE,
    });
    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

// Staff/admin only. Soft-cancels rather than hard-deleting so revenue
// reporting and history stay intact — a hard delete would also violate
// the Booking→Appointment foreign key if a booking exists.
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
      }
      return appointment;
    });
    return sendSuccess(res, result, 200, 'Appointment cancelled');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

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
    const cancelled = await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } },
      include: FULL_INCLUDE,
    });

    await prisma.appointment.updateMany({
      where: { id: { in: appointmentIds } },
      data: { status: 'CANCELLED' },
    });
    await prisma.booking.updateMany({
      where: { appointmentId: { in: appointmentIds } },
      data: { status: 'CANCELLED' },
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

    const existing = await prisma.appointment.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!existing) return sendError(res, 'Appointment not found', 404);

    const ownerEmail = existing.booking?.client?.user?.email;
    const isOwner = req.user && existing.booking?.client?.userId === req.user.id;
    const isStaffOrAdmin = req.user && ['ADMIN', 'STAFF'].includes(req.user.role);
    const emailMatches =
      req.body.email && ownerEmail && req.body.email.toLowerCase() === ownerEmail.toLowerCase();

    if (!isOwner && !isStaffOrAdmin && !emailMatches) {
      return sendError(res, 'Not authorized to reschedule this appointment', 403);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { date: new Date(newDate), status: 'RESCHEDULED' },
      include: FULL_INCLUDE,
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
    return sendError(res, err.message, 400);
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