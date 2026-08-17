// src/auth/authRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, logoutAll, verifyOtp, resendOtp } from './authController.js';
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

// Tighter than authLimiter: a 6-digit code only has 1,000,000
// combinations, and verifyOtp already caps attempts per-code at 5 — this
// caps attempts per-IP across codes, so cycling through resends can't be
// used to reset the per-code counter and keep guessing indefinitely.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

export default router;
