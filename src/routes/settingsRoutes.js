// src/routes/settingsRoutes.js
import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import {
  validateSettingsCreate,
  validateSettingsUpdate,
} from '../validators/settingsValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Business hours — read is available to any authenticated staff/admin (the
// public booking flow itself doesn't hit this route; it reads the config
// server-side while computing availability). Only admins can change it.
router.get('/business-hours', authenticate, requireRole('ADMIN', 'STAFF'), settingsController.getBusinessHours);
router.get('/business-hours/defaults', authenticate, requireRole('ADMIN', 'STAFF'), settingsController.getBusinessHoursDefaults);
router.put('/business-hours', authenticate, requireRole('ADMIN'), settingsController.updateBusinessHours);

// Payment policy — deposit requirement at booking time. Read is public
// (not sensitive, and the client booking flow needs it before a booking
// even exists — the /payments/quote endpoint only works after that).
// Only admins can change it.
router.get('/payment-policy', settingsController.getPaymentPolicy);
router.get('/payment-policy/defaults', authenticate, requireRole('ADMIN', 'STAFF'), settingsController.getPaymentPolicyDefaults);
router.put('/payment-policy', authenticate, requireRole('ADMIN'), settingsController.updatePaymentPolicy);

// Generic settings CRUD — admin-only. Previously these only required
// `authenticate`, meaning any logged-in client could read or overwrite
// arbitrary business settings.
router.post('/', authenticate, requireRole('ADMIN'), validateSettingsCreate, settingsController.createSetting);
router.get('/:id', authenticate, requireRole('ADMIN'), settingsController.getSetting);
router.get('/key/:key', authenticate, requireRole('ADMIN'), settingsController.getSettingByKey);
router.get('/', authenticate, requireRole('ADMIN'), settingsController.getSettings);
router.put('/:id', authenticate, requireRole('ADMIN'), validateSettingsUpdate, settingsController.updateSetting);
router.delete('/:id', authenticate, requireRole('ADMIN'), settingsController.deleteSetting);

export default router;
