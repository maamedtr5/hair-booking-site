// src/routes/webhookRoutes.js
import express from 'express';
import { paystackWebhook } from '../controllers/webhookController.js';
import { validatePaystackWebhook } from '../validators/webhookValidator.js';

const router = express.Router();

//     Paystack webhook route with raw body for signature verification
router.post(
  '/paystack',
  express.raw({ type: '*/*' }),   // raw body required for HMAC
  validatePaystackWebhook,
  paystackWebhook
);

export default router;
