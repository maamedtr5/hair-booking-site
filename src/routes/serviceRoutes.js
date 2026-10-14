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
import { optionalAuth } from '../middleware/optionalAuth.js';
import { uploadSingleImage } from '../middleware/imageUpload.js';
import { makeUploadImageHandler, makeDeleteImageHandler } from '../controllers/serviceImageController.js';
import {
  validateServiceCreate,
  validateServiceUpdate,
  validateServiceIdParam,
  validateServiceListQuery,
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

// Get all services (supports skip/take pagination). optionalAuth lets the
// controller show guests only ACTIVE services while admins see everything.
router.get('/', optionalAuth, validateServiceListQuery, getServices);

// Get a single service by ID
router.get('/:id', optionalAuth, validateServiceIdParam, getService);

// Service photo (Admin only). authenticate + requireRole run BEFORE the
// multipart parser so guests can never make the server buffer an upload.
router.post(
  '/:id/image',
  authenticate,
  requireRole('admin'),
  validateServiceIdParam,
  uploadSingleImage,
  makeUploadImageHandler('service')
);
router.delete(
  '/:id/image',
  authenticate,
  requireRole('admin'),
  validateServiceIdParam,
  makeDeleteImageHandler('service')
);

// Update a service (Admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateServiceUpdate,
  updateService
);

// Delete a service (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), validateServiceIdParam, deleteService);

export default router;
