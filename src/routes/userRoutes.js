// src/routes/userRoutes.js
import express from 'express';
import {
  createUserHandler,
  getUserHandler,
  getUsersHandler,
  updateUserHandler,
  deleteUserHandler,
  register,
  login,
  updateGoogleTokens,
  disconnectGoogleCalendar
} from '../controllers/userController.js';
import { 
  validateUserRegistration, 
  validateUserLogin, 
  validateUserUpdate,
  validateGoogleTokenUpdate,
  validateGoogleDisconnect
} from '../validators/userValidator.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 👤 User CRUD routes
router.post('/', validateUserRegistration, createUserHandler);
router.get('/:id', authenticate, getUserHandler);
router.get('/', authenticate, getUsersHandler);
router.put('/:id', authenticate, validateUserUpdate, updateUserHandler);

// DELETE /users/:id with ownership/admin check
router.delete('/:id', authenticate, (req, res, next) => {
  const userId = parseInt(req.params.id);
  const requester = req.user; // set by authenticate middleware

  // Allow if requester is ADMIN or deleting their own account
  if (requester.role === 'ADMIN' || requester.id === userId) {
    return deleteUserHandler(req, res, next);
  }

  return res.status(403).json({ error: 'Forbidden: not allowed to delete this user' });
});

// Google Calendar integration routes
router.put(
  '/:id/google/tokens',
  authenticate,
  validateGoogleTokenUpdate,
  updateGoogleTokens
);

router.delete(
  '/:id/google/disconnect',
  authenticate,
  validateGoogleDisconnect,
  disconnectGoogleCalendar
);

export default router;
