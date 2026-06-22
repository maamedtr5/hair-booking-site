import express from 'express';
import { createIntakeForm } from '../controllers/intakeController.js';

const router = express.Router();

router.post('/', createIntakeForm);

export default router;
