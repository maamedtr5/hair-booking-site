import express from 'express';
import { createConsentForm } from '../controllers/consentController.js';

const router = express.Router();

router.post('/', createConsentForm);

export default router;
