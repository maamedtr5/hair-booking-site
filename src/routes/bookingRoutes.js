// src/routes/bookingRoutes.js
import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateBookingCreate, validateBookingUpdate } from '../validators/bookingValidator.js';

const router = express.Router();

// POST /bookings → any logged-in user can create
router.post(
  '/',
  authenticate,
  validateBookingCreate,
  bookingController.createBooking
);

// GET routes → public
router.get('/:id', bookingController.getBooking);
router.get('/', bookingController.getBookings);

// PUT /bookings/:id → only admin can update
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateBookingUpdate,
  bookingController.updateBooking
);

// DELETE /bookings/:id → only admin can delete
router.delete('/:id', authenticate, requireRole('admin'), bookingController.deleteBooking);

export default router;
