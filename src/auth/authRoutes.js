// src/auth/authRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, logoutAll } from './authController.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { authenticate } from './authMiddleware.js';

const router = express.Router();



const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

export default router;
