// src/routes/serviceCategoryRoutes.js
import express from 'express';
import {
  createCategory,
  getCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/serviceCategoryController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  validateCategoryCreate,
  validateCategoryUpdate,
  validateCategoryIdParam,
} from '../validators/serviceCategoryValidator.js';

const router = express.Router();

// Public (booking page) + admin (dashboard) share this list — optionalAuth
// lets the controller tell the two apart to decide what to include.
router.get('/', optionalAuth, getCategories);
router.get('/:id', optionalAuth, validateCategoryIdParam, getCategory);

// Admin only
router.post('/', authenticate, requireRole('admin'), validateCategoryCreate, createCategory);
router.put('/:id', authenticate, requireRole('admin'), validateCategoryUpdate, updateCategory);
router.delete('/:id', authenticate, requireRole('admin'), validateCategoryIdParam, deleteCategory);

export default router;
