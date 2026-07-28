// src/routes/promocodeRoutes.js
import express from 'express';
import * as promocodeController from '../controllers/promocodeController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validatePromoCodeCreate, validatePromoCodeUpdate } from '../validators/promoCodeValidator.js';

const router = express.Router();

// POST /promocodes
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validatePromoCodeCreate,
  promocodeController.createPromocode
);

// GET routes
// The full list (and lookup-by-id) reveal every promo code including
// ones not yet announced — that's business-sensitive, not something a
// browsing client should be able to enumerate. Checkout only ever needs
// to validate a code the client already typed in, which is /code/:code.
router.get('/:id', authenticate, requireRole('ADMIN', 'STAFF'), promocodeController.getPromocode);
router.get('/code/:code', promocodeController.getPromocodeByCode);
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), promocodeController.getPromocodes);

// PUT /promocodes/:id
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validatePromoCodeUpdate,
  promocodeController.updatePromocode
);

// DELETE /promocodes/:id
router.delete('/:id', authenticate, requireRole('admin'), promocodeController.deletePromocode);

export default router;