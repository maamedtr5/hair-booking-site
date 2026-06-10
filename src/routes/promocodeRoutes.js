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
router.get('/:id', promocodeController.getPromocode);
router.get('/code/:code', promocodeController.getPromocodeByCode);
router.get('/', promocodeController.getPromocodes);

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
