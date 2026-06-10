// src/routes/paymentRoutes.js
import express from 'express';
import { 
  initializePayment, 
  markPaymentSuccess, 
  markPaymentFailed 
} from '../controllers/paymentController.js';
import { authenticate, authorizeRoles } from '../auth/authMiddleware.js';
import { validatePaymentCreate } from '../validators/paymentValidator.js';

const router = express.Router();

//   Initialize payment (Paystack, Cash, Mobile Money)
router.post(
  '/init',
  authenticate,
  validatePaymentCreate,   // validation wrapper added
  initializePayment
);

//   Admin/stylist updates static payment status
router.put(
  '/:id/success',
  authenticate,
  authorizeRoles('ADMIN', 'STYLIST'),
  markPaymentSuccess
);

router.put(
  '/:id/failed',
  authenticate,
  authorizeRoles('ADMIN', 'STYLIST'),
  markPaymentFailed
);

export default router;
