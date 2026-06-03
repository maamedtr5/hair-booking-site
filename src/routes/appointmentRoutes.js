// src/routes/appointmentRoutes.js
import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
} from '../jobs/reminderJobs.js';
import {
  syncAppointmentToStaffCalendar,
  deleteCalendarEvent,
  updateCalendarEvent,
} from '../services/googleCalendarService.js';
import pkg from '@prisma/client';
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateBulkCancel,
} from '../validators/appointmentValidator.js';

const { PrismaClient } = pkg;
const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// RULE: specific paths MUST come before wildcard paths (/:id).
// Express matches top-to-bottom and stops at the first match.
// A route like GET /client/:clientId registered after GET /:id will never run —
// Express treats "client" as the value of :id and moves on.
//
// Correct order for each HTTP verb:
//   1. Static segments first   — POST /bulk/cancel
//   2. Mixed static+param      — GET /client/:clientId, GET /date/:date …
//   3. Wildcard param last      — GET /:id, PUT /:id, DELETE /:id
//   4. Nested wildcard last     — PUT /:id/reschedule, POST /:id/sync-calendar …
//      (these come after /:id because Express reads left-to-right too)
// ─────────────────────────────────────────────────────────────────────────────


// ── POST ─────────────────────────────────────────────────────────────────────

// POST /bulk/cancel — MUST be before POST / if we ever add a POST /:id route,
// and especially before any /:id sub-route handlers.
router.post(
  '/bulk/cancel',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  validateBulkCancel,
  async (req, res) => {
    try {
      const { appointmentIds } = req.body;

      if (!appointmentIds || !Array.isArray(appointmentIds)) {
        return res.status(400).json({
          success: false,
          message: 'appointmentIds array is required',
        });
      }

      const appointments = await prisma.appointment.findMany({
        where: { id: { in: appointmentIds.map((id) => parseInt(id)) } },
        include: { staff: true },
      });

      for (const appointment of appointments) {
        try {
          await cancelAppointmentReminder(appointment.id.toString());
        } catch (err) {
          console.error(`Failed to cancel reminder for ${appointment.id}:`, err.message);
        }

        if (appointment.googleEventId) {
          try {
            const staffUserId = appointment.staff?.userId ?? appointment.staffId;
            await deleteCalendarEvent(staffUserId, appointment.googleEventId);
          } catch (err) {
            console.error(`Failed to delete calendar event for ${appointment.id}:`, err.message);
          }
        }
      }

      await appointmentController.bulkCancelAppointments(req, res);
    } catch (error) {
      console.error('Error bulk cancelling appointments:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to bulk cancel appointments',
          error: error.message,
        });
      }
    }
  }
);

// POST / — create appointment
router.post('/', validateAppointmentCreate, async (req, res) => {
  try {
    const appointment = await appointmentController.createAppointment(req, res);

    if (appointment && appointment.id) {
      try {
        await scheduleAppointmentReminder(appointment.id);
        console.log(`Reminder scheduled for appointment ${appointment.id}`);
      } catch (err) {
        console.error('Failed to schedule reminder:', err.message);
      }

      try {
        const calendarResult = await syncAppointmentToStaffCalendar(appointment.id);
        console.log(`Synced to Google Calendar: ${calendarResult.eventId}`);
      } catch (err) {
        console.warn('Could not sync to Google Calendar:', err.message);
      }
    }
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to create appointment',
        error: error.message,
      });
    }
  }
});

// POST /:id/sync-calendar — MUST be before POST /:id if that ever exists,
// and grouped here with other /:id sub-routes for readability.
router.post(
  '/:id/sync-calendar',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      const result = await syncAppointmentToStaffCalendar(req.params.id);
      res.json({
        success: true,
        message: 'Appointment synced to Google Calendar',
        eventId: result.eventId,
        eventLink: result.eventLink,
      });
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync to Google Calendar',
        error: error.message,
      });
    }
  }
);

// POST /:id/send-reminder
router.post(
  '/:id/send-reminder',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      await scheduleAppointmentReminder(req.params.id);
      res.json({ success: true, message: 'Reminder scheduled successfully' });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule reminder',
        error: error.message,
      });
    }
  }
);


// ── GET ──────────────────────────────────────────────────────────────────────
// IMPORTANT: all GET /filter-name/:param routes come before GET /:id.

// GET /client/:clientId
router.get('/client/:clientId', authenticate, appointmentController.getAppointmentsByClient);

// GET /staff/:staffId
router.get(
  '/staff/:staffId',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  appointmentController.getAppointmentsByStaff
);

// GET /date/:date
router.get(
  '/date/:date',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  appointmentController.getAppointmentsByDate
);

// GET /status/:status
router.get(
  '/status/:status',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  appointmentController.getAppointmentsByStatus
);

// GET / — list all (after filter routes so none of them are mistaken for /:id)
router.get('/', authenticate, appointmentController.getAppointments);

// GET /:id — single appointment (MUST be last among GET routes)
router.get('/:id', authenticate, appointmentController.getAppointment);


// ── PUT ──────────────────────────────────────────────────────────────────────
// PUT /:id/reschedule — specific nested path BEFORE the bare /:id wildcard.
router.put(
  '/:id/reschedule',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      const existingAppointment = await prisma.appointment.findUnique({
        where: { id: parseInt(appointmentId) },
        include: { service: true, staff: true },
      });

      if (!existingAppointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const rescheduledAppointment = await appointmentController.rescheduleAppointment(req, res);

      if (rescheduledAppointment) {
        try {
          await cancelAppointmentReminder(appointmentId);
          await scheduleAppointmentReminder(appointmentId);
          console.log(`Reminder rescheduled for appointment ${appointmentId}`);
        } catch (err) {
          console.error('Failed to reschedule reminder:', err.message);
        }

        if (existingAppointment.googleEventId) {
          try {
            const staffUserId = existingAppointment.staff?.userId ?? existingAppointment.staffId;
            const startTime = new Date(req.body.newDate ?? req.body.date);
            const endTime = new Date(
              startTime.getTime() + (existingAppointment.service?.duration ?? 60) * 60000
            );
            await updateCalendarEvent(staffUserId, existingAppointment.googleEventId, {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            });
            console.log(`Updated Google Calendar event: ${existingAppointment.googleEventId}`);
          } catch (err) {
            console.error('Failed to update Google Calendar:', err.message);
          }
        }
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to reschedule appointment',
          error: error.message,
        });
      }
    }
  }
);

// PUT /:id — update appointment (bare wildcard, MUST be after /:id/reschedule)
router.put(
  '/:id',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  validateAppointmentUpdate,
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      const existingAppointment = await prisma.appointment.findUnique({
        where: { id: parseInt(appointmentId) },
        include: { service: true, staff: true },
      });

      if (!existingAppointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const updatedAppointment = await appointmentController.updateAppointment(req, res);

      if (updatedAppointment && updatedAppointment.id) {
        if (req.body.status === 'CANCELLED') {
          try {
            await cancelAppointmentReminder(appointmentId);
          } catch (err) {
            console.error('Failed to cancel reminder:', err.message);
          }

          if (existingAppointment.googleEventId) {
            try {
              const staffUserId = existingAppointment.staff?.userId ?? existingAppointment.staffId;
              await deleteCalendarEvent(staffUserId, existingAppointment.googleEventId);
            } catch (err) {
              console.error('Failed to delete from Google Calendar:', err.message);
            }
          }
        } else if (req.body.date && req.body.date !== existingAppointment.date) {
          try {
            await cancelAppointmentReminder(appointmentId);
            await scheduleAppointmentReminder(appointmentId);
          } catch (err) {
            console.error('Failed to reschedule reminder:', err.message);
          }

          if (existingAppointment.googleEventId) {
            try {
              const staffUserId = existingAppointment.staff?.userId ?? existingAppointment.staffId;
              const startTime = new Date(req.body.date);
              const endTime = new Date(
                startTime.getTime() + (existingAppointment.service?.duration ?? 60) * 60000
              );
              await updateCalendarEvent(staffUserId, existingAppointment.googleEventId, {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              });
            } catch (err) {
              console.error('Failed to update Google Calendar:', err.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to update appointment',
          error: error.message,
        });
      }
    }
  }
);


// ── DELETE ────────────────────────────────────────────────────────────────────
// DELETE /:id/calendar-event and /:id/reminder — nested paths BEFORE bare /:id.

// DELETE /:id/calendar-event
router.delete(
  '/:id/calendar-event',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { staff: true },
      });

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      if (!appointment.googleEventId) {
        return res.status(400).json({
          success: false,
          message: 'No Google Calendar event associated with this appointment',
        });
      }

      const staffUserId = appointment.staff?.userId ?? appointment.staffId;
      await deleteCalendarEvent(staffUserId, appointment.googleEventId);

      await prisma.appointment.update({
        where: { id: parseInt(req.params.id) },
        data: { googleEventId: null },
      });

      res.json({ success: true, message: 'Event removed from Google Calendar' });
    } catch (error) {
      console.error('Error removing calendar event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from Google Calendar',
        error: error.message,
      });
    }
  }
);

// DELETE /:id/reminder
router.delete(
  '/:id/reminder',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      const result = await cancelAppointmentReminder(req.params.id);
      res.json({ success: true, message: 'Reminder cancelled successfully', cancelled: result.cancelled });
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel reminder',
        error: error.message,
      });
    }
  }
);

// DELETE /:id — delete appointment (bare wildcard, MUST be after nested paths)
router.delete(
  '/:id',
  authenticate,
  requireRole(['ADMIN', 'STAFF']),
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      const appointment = await prisma.appointment.findUnique({
        where: { id: parseInt(appointmentId) },
        include: { staff: true },
      });

      if (appointment) {
        try {
          await cancelAppointmentReminder(appointmentId);
        } catch (err) {
          console.error('Failed to cancel reminder:', err.message);
        }

        if (appointment.googleEventId) {
          try {
            const staffUserId = appointment.staff?.userId ?? appointment.staffId;
            await deleteCalendarEvent(staffUserId, appointment.googleEventId);
          } catch (err) {
            console.error('Failed to delete from Google Calendar:', err.message);
          }
        }
      }

      await appointmentController.deleteAppointment(req, res);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete appointment',
          error: error.message,
        });
      }
    }
  }
);

export default router;