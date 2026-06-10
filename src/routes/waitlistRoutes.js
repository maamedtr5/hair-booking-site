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
  requireRole('client'),          
  validateWaitlistCreate,
  addToWaitlistHandler
);

//   Get single waitlist entry → admin or stylist
router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'stylist']),  //      restrict to admin/stylist
  getWaitlistEntryHandler
);

//   Get all waitlist entries → admin or stylist
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'stylist']),  //      restrict to admin/stylist
  getWaitlistEntriesHandler
);

//   Update waitlist entry → admin or stylist
router.put(
  '/:id',
  authenticate,
  requireRole(['admin', 'stylist']),  //      restrict to admin/stylist
  validateWaitlistUpdate,
  updateWaitlistEntryHandler
);

//   Delete waitlist entry → admin only
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),              //      only admin can delete
  deleteWaitlistEntryHandler
);

export default router;
