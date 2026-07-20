// src/routes/bookingRoutes.js
// Note: the primary client-facing "book now" flow is now POST /appointments
// (creates the Appointment + Booking together). This POST /bookings stays
// available for staff/admin to manually attach a booking to an existing
// appointment (e.g. phone bookings).
import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateBookingCreate, validateBookingUpdate } from '../validators/bookingValidator.js';

const router = express.Router();

router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), validateBookingCreate, bookingController.createBooking);

// Guest-safe: no login required, but the controller only returns the
// booking if the caller owns it, is staff/admin, or passes ?email= that
// matches the booking's contact email.
router.get('/:id', optionalAuth, bookingController.getBooking);

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), bookingController.getBookings);
router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), validateBookingUpdate, bookingController.updateBooking);
router.delete('/:id', authenticate, requireRole('ADMIN'), bookingController.deleteBooking);

export default router;