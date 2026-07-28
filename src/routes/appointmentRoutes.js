 // src/routes/appointmentRoutes.js
import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateBulkCancel,
  validateInternalAppointmentUpdate,
} from '../validators/appointmentValidator.js';

const router = express.Router();

// --- Listing all appointments is staff/admin-only: every record carries ---
// --- client name/email/phone/notes, so this can never be public.       ---
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.getAppointments);

// --- Single-record lookup stays guest-reachable, but the controller ---
// --- itself enforces owner / staff-admin / matching ?email= — same  ---
// --- pattern as GET /bookings/:id.                                  ---
router.get('/:id', optionalAuth, appointmentController.getAppointment);

// --- Public: booking itself needs no login either ---
// optionalAuth attaches req.user when a token is present but never blocks.
// Guests must include guestName/guestEmail/guestPhone in the body instead.
router.post('/', optionalAuth, validateAppointmentCreate, appointmentController.createAppointment);
router.post('/:id/reschedule', optionalAuth, appointmentController.rescheduleAppointment);

// --- Sensitive: staff/admin only from here down ---
router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), validateAppointmentUpdate, appointmentController.updateAppointment);
router.delete('/:id', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.deleteAppointment);
router.post('/:id/no-show', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.markAppointmentNoShow);
router.post('/bulk-cancel', authenticate, requireRole('ADMIN', 'STAFF'), validateBulkCancel, appointmentController.bulkCancelAppointments);
router.put('/internal/:id', authenticate, requireRole('ADMIN'), validateInternalAppointmentUpdate, appointmentController.internalUpdateAppointment);
router.post('/:id/reminder', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.scheduleAppointmentReminder);
router.delete('/:id/reminder', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.cancelAppointmentReminder);
router.get('/stats/queue', authenticate, requireRole('ADMIN'), appointmentController.getQueueStats);

// --- These were exported from the controller and called by the frontend ---
// --- (getAppointmentsByClient/Staff/Date/Status) but never mounted — any ---
// --- request to them was falling through to the 404 handler. Same bug   ---
// --- class as the consentRoutes/intakeRoutes gap from before: a route   ---
// --- defined in the controller but never registered in the router.     ---
router.get('/client/:clientId', authenticate, appointmentController.getAppointmentsByClient);
router.get('/staff/:staffId', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.getAppointmentsByStaff);
router.get('/date/:date', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.getAppointmentsByDate);
router.get('/status/:status', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.getAppointmentsByStatus);

export default router;