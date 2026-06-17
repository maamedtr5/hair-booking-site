
import express from 'express';
import { 
  getRevenueReportHandler, 
  getTopServicesReportHandler 
} from '../controllers/reportController.js';
import { 
  validateRevenueReport, 
  validateTopServicesReport 
} from '../validators/reportValidator.js';
import {requireRole } from '../middleware/roleMiddleware.js';
import { authenticate} from '../auth/authMiddleware.js'

const router = express.Router();

// Revenue report (optionally filtered by date range)
router.get(
  '/revenue',
  authenticate,
  requireRole('ADMIN'),
  validateRevenueReport,
  getRevenueReportHandler
);

// Top services report (optionally limited)
router.get(
  '/top-services',
  authenticate,
  requireRole('ADMIN'),
  validateTopServicesReport,
  getTopServicesReportHandler
);

export default router;
