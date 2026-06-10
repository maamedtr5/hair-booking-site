// src/routes/authRoutes.js
import express from 'express';
import { register, login } from '../auth/authController.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

const router = express.Router();

// POST /auth/register
router.post('/register', validateRegister, register);

// POST /auth/login
router.post('/login', validateLogin, login);

export default router;
