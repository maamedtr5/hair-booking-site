// src/routes/paymentRoutes.js
import express from 'express';
import {
  initializePayment,
  markPaymentSuccess,
  markPaymentFailed,
  getPayments,
  recordManualPayment,
  getPaymentQuote,
} from '../controllers/paymentController.js';
import { authenticate, authorizeRoles } from '../auth/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validatePaymentCreate } from '../validators/paymentValidator.js';

const router = express.Router();

// What will this booking actually cost right now (full price / deposit /
// nothing)? Needed before the client commits to the payment step.
router.get('/quote/:bookingId', optionalAuth, getPaymentQuote);

// Initialize payment (Paystack, Cash, Mobile Money). Was requiring
// `authenticate`, which hard-rejects any request with no token — but
// guests (no account) also need to be able to pay a deposit when the
// booking flow calls this right after creating their appointment.
// optionalAuth matches the same pattern used for guest appointment
// creation: attach req.user if a token is present, but never block.
router.post(
  '/init',
  optionalAuth,
  validatePaymentCreate,
  initializePayment
);

// Staff/admin logs a payment collected in person (cash or MoMo, directly
// between client and staff/admin) — the default pay-after flow.
router.post(
  '/manual',
  authenticate,
  authorizeRoles('ADMIN', 'STAFF'),
  recordManualPayment
);

// Admin/staff updates static payment status
router.put(
  '/:id/success',
  authenticate,
  authorizeRoles('ADMIN', 'STAFF'),
  markPaymentSuccess
);

router.put(
  '/:id/failed',
  authenticate,
  authorizeRoles('ADMIN', 'STAFF'),
  markPaymentFailed
);

// Get all payments (paginated)
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'STAFF'),
  getPayments
);

export default router;
