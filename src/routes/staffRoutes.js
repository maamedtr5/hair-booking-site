// src/routes/staffRoutes.js
import express from 'express';
import * as staffController from '../controllers/staffController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateStaffCreate, validateStaffUpdate } from '../validators/staffValidator.js';

const router = express.Router();

// Public: clients need to see the stylist directory (name/bio) to pick
// one when booking. sendSuccess() strips the nested user.password
// centrally, so this is safe to leave open.
router.get('/:id', staffController.getStaffHandler);
router.get('/', staffController.getStaffsHandler);

// Create/update/delete staff profiles is admin-only management, not just
// "any logged-in user" — these previously only required `authenticate`
// with no role check at all, so any authenticated CLIENT could create a
// staff profile pointing at someone else's account, edit any stylist's
// bio, or delete a stylist outright.
router.post('/', authenticate, requireRole('ADMIN'), validateStaffCreate, staffController.createStaffHandler);
router.put('/:id', authenticate, requireRole('ADMIN'), validateStaffUpdate, staffController.updateStaffHandler);
router.delete('/:id', authenticate, requireRole('ADMIN'), staffController.deleteStaffHandler);

export default router;