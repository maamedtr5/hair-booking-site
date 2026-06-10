// src/routes/adminRoutes.js
import express from 'express';
import {
  createAdminHandler,
  getAdminHandler,
  getAdminsHandler,
  updateAdminHandler,
  deleteAdminHandler
} from '../controllers/adminController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

//   Admin-only protected routes
router.post('/', authenticate, requireRole('ADMIN'), createAdminHandler);
router.get('/', authenticate, requireRole('ADMIN'), getAdminsHandler);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteAdminHandler);

//   Other routes (still require authentication, but not restricted to ADMIN)
router.get('/:id', authenticate, getAdminHandler);
router.put('/:id', authenticate, updateAdminHandler);

export default router;
