import express from 'express';
import { createIntakeForm } from '../controllers/intakeController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { validateIntakeCreate } from '../validators/clientFormValidator.js';

const router = express.Router();

// Health data: login required (the only caller is the logged-in client
// profile page). Ownership is enforced in the controller.
router.post('/', authenticate, validateIntakeCreate, createIntakeForm);

export default router;
