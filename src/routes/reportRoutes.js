// src/routes/reportRoutes.js
import express from 'express';
import { 
  getRevenueReportHandler, 
  getTopServicesReportHandler 
} from '../controllers/reportController.js';
import { 
  validateRevenueReport, 
  validateTopServicesReport 
} from '../validators/reportValidator.js';
import { authenticate } from '../auth/authMiddleware.js';

const router = express.Router();

//    Revenue report (optionally filtered by date range)
router.get(
  '/revenue',
  authenticate,
  validateRevenueReport,
  getRevenueReportHandler
);

//    Top services report (optionally limited)
router.get(
  '/top-services',
  authenticate,
  validateTopServicesReport,
  getTopServicesReportHandler
);

export default router;
