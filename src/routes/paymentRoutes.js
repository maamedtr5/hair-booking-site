// src/routes/paymentRoutes.js
import express from 'express';
import { 
  initializePayment, 
  markPaymentSuccess, 
  markPaymentFailed,
  getPayments   
} from '../controllers/paymentController.js';
import { authenticate, authorizeRoles } from '../auth/authMiddleware.js';
import { validatePaymentCreate } from '../validators/paymentValidator.js';

const router = express.Router();

// Initialize payment (Paystack, Cash, Mobile Money)
router.post(
  '/init',
  authenticate,
  validatePaymentCreate,
  initializePayment
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
