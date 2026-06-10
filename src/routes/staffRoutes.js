// src/routes/staffRoutes.js
import express from 'express';
import * as staffController from '../controllers/staffController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { validateStaffCreate, validateStaffUpdate } from '../validators/staffValidator.js';

const router = express.Router();

// Create staff → requireAuth + validator
router.post('/', authenticate, validateStaffCreate, staffController.createStaffHandler);

// Get staff
router.get('/:id', staffController.getStaffHandler);
router.get('/', staffController.getStaffsHandler);

// Update staff → requireAuth + validator
router.put('/:id', authenticate, validateStaffUpdate, staffController.updateStaffHandler);

// Delete staff → requireAuth
router.delete('/:id', authenticate, staffController.deleteStaffHandler);

export default router;
