// src/routes/serviceRoutes.js
import express from 'express';
import {
  createService,
  getService,
  getServices,
  updateService,
  deleteService,
} from '../controllers/serviceController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  validateServiceCreate,
  validateServiceUpdate,
} from '../validators/serviceValidator.js';

const router = express.Router();

// Create a new service (Admin only)
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateServiceCreate,
  createService
);

// Get all services (supports skip/take pagination)
router.get('/', getServices);

// Get a single service by ID
router.get('/:id', getService);

// Update a service (Admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateServiceUpdate,
  updateService
);

// Delete a service (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), deleteService);

export default router;
