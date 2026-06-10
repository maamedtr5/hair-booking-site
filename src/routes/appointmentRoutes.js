// src/routes/appointmentRoutes.js
import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateBulkCancel,
  validateInternalAppointmentUpdate
} from '../validators/appointmentValidator.js';

const router = express.Router();

// Create appointment
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateAppointmentCreate,
  appointmentController.createAppointment
);

// Get appointments
router.get('/:id', appointmentController.getAppointment);
router.get('/', appointmentController.getAppointments);

// Update appointment
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateAppointmentUpdate,
  appointmentController.updateAppointment
);

// Cancel appointment
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  appointmentController.deleteAppointment
);

// Bulk cancel appointments
router.post(
  '/bulk-cancel',
  authenticate,
  requireRole('admin'),
  validateBulkCancel,
  appointmentController.bulkCancelAppointments
);

// Internal system update (calendar sync + reminders)
router.put(
  '/internal/:id',
  validateInternalAppointmentUpdate,
  appointmentController.internalUpdateAppointment
);

// Reschedule appointment
router.post(
  '/:id/reschedule',
  authenticate,
  requireRole('admin'),
  appointmentController.rescheduleAppointment
);

// Reminder scheduling
router.post(
  '/:id/reminder',
  authenticate,
  requireRole('admin'),
  appointmentController.scheduleAppointmentReminder
);

// Reminder cancellation
router.delete(
  '/:id/reminder',
  authenticate,
  requireRole('admin'),
  appointmentController.deleteAppointment
);

// Queue stats
router.get(
  '/stats/queue',
  authenticate,
  requireRole('admin'),
  appointmentController.getQueueStats
);

export default router;
