// src/routes/waitlistRoutes.js
import express from 'express';
import {
  addToWaitlistHandler,
  getWaitlistEntryHandler,
  getWaitlistEntriesHandler,
  updateWaitlistEntryHandler,
  deleteWaitlistEntryHandler
} from '../controllers/waitlistController.js';
import {
  validateWaitlistCreate,
  validateWaitlistUpdate
} from '../validators/waitlistValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

//   Add to waitlist → any authenticated client can add themselves
router.post(
  '/',
  authenticate,
  requireRole('CLIENT'),
  validateWaitlistCreate,
  addToWaitlistHandler
);

//   Get single waitlist entry → admin or stylist
router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),  // restrict to admin/staff
  getWaitlistEntryHandler
);

//   Get all waitlist entries → admin or stylist
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),  // restrict to admin/staff
  getWaitlistEntriesHandler
);

//   Update waitlist entry → admin or stylist
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),  // restrict to admin/staff
  validateWaitlistUpdate,
  updateWaitlistEntryHandler
);

//   Delete waitlist entry → admin only
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),  // only admin can delete
  deleteWaitlistEntryHandler
);

export default router;
