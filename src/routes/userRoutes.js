// src/routes/userRoutes.js
import express from 'express';
import {
  createUserHandler,
  getUserHandler,
  getUsersHandler,
  updateUserHandler,
  deleteUserHandler,
  updateUserRoleHandler,
  updateGoogleTokens,
  disconnectGoogleCalendar,
} from '../controllers/userController.js';
import {
  validateUserRegistration,
  validateUserUpdate,
  validateGoogleTokenUpdate,
  validateGoogleDisconnect,
} from '../validators/userValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();


router.post('/', authenticate, requireRole('ADMIN'), validateUserRegistration, createUserHandler);

router.get('/:id', authenticate, getUserHandler); // ownership/admin check inside controller
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), getUsersHandler);
router.put('/:id', authenticate, validateUserUpdate, updateUserHandler); // ownership check inside controller


router.put('/:id/role', authenticate, requireRole('ADMIN'), updateUserRoleHandler);

router.delete('/:id', authenticate, (req, res, next) => {
  const userId = parseInt(req.params.id, 10);
  const requester = req.user;
  if (requester.role === 'ADMIN' || requester.id === userId) {
    return deleteUserHandler(req, res, next);
  }
  return res.status(403).json({ success: false, message: 'Forbidden: not allowed to delete this user' });
});

router.put('/:id/google/tokens', authenticate, validateGoogleTokenUpdate, updateGoogleTokens);
router.delete('/:id/google/disconnect', authenticate, validateGoogleDisconnect, disconnectGoogleCalendar);

export default router;