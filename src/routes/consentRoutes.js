import express from 'express';
import { createConsentForm } from '../controllers/consentController.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateConsentCreate } from '../validators/clientFormValidator.js';

const router = express.Router();

// optionalAuth: guests file consent right after booking (proved in the
// controller); logged-in users are checked against their own client record.
router.post('/', optionalAuth, validateConsentCreate, createConsentForm);

export default router;
