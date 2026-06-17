// src/routes/serviceRoutes.js
import express from 'express';
import * as serviceController from '../controllers/serviceController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateServiceCreate, validateServiceUpdate } from '../validators/serviceValidator.js';

const router = express.Router();

// POST /services
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateServiceCreate,
  serviceController.createService
);

// GET /services/:id
router.get('/:id', serviceController.getService);

// GET /services (paginated via skip/take query params)
router.get('/', serviceController.getServices);

// PUT /services/:id
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateServiceUpdate,
  serviceController.updateService
);

// DELETE /services/:id
router.delete('/:id', authenticate, requireRole('admin'), serviceController.deleteService);

export default router;
