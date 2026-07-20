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

// --- Public: browsing needs no login at all ---
router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointment);

// --- Public: booking itself needs no login either ---
// optionalAuth attaches req.user when a token is present but never blocks.
// Guests must include guestName/guestEmail/guestPhone in the body instead.
router.post('/', optionalAuth, validateAppointmentCreate, appointmentController.createAppointment);
router.post('/:id/reschedule', optionalAuth, appointmentController.rescheduleAppointment);

// --- Sensitive: staff/admin only from here down ---
router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), validateAppointmentUpdate, appointmentController.updateAppointment);
router.delete('/:id', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.deleteAppointment);
router.post('/bulk-cancel', authenticate, requireRole('ADMIN', 'STAFF'), validateBulkCancel, appointmentController.bulkCancelAppointments);
router.put('/internal/:id', authenticate, requireRole('ADMIN'), validateInternalAppointmentUpdate, appointmentController.internalUpdateAppointment);
router.post('/:id/reminder', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.scheduleAppointmentReminder);
router.delete('/:id/reminder', authenticate, requireRole('ADMIN', 'STAFF'), appointmentController.cancelAppointmentReminder);
router.get('/stats/queue', authenticate, requireRole('ADMIN'), appointmentController.getQueueStats);

export default router;