// src/auth/authRoutes.js
import express from 'express';
import { register, login, logout, logoutAll } from './authController.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { authenticate } from './authMiddleware.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

export default router;