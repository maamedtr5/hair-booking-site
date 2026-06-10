// src/routes/settingsRoutes.js
import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { 
  validateSettingsCreate, 
  validateSettingsUpdate 
} from '../validators/settingsValidator.js';
import { authenticate } from '../auth/authMiddleware.js';

const router = express.Router();

//   Create new setting
router.post(
  '/',
  authenticate,
  validateSettingsCreate,
  settingsController.createSetting
);

//   Get setting by ID
router.get(
  '/:id',
  authenticate,
  settingsController.getSetting
);

//   Get setting by key
router.get(
  '/key/:key',
  authenticate,
  settingsController.getSettingByKey
);

//   Get all settings
router.get(
  '/',
  authenticate,
  settingsController.getSettings
);

//   Update setting
router.put(
  '/:id',
  authenticate,
  validateSettingsUpdate,
  settingsController.updateSetting
);

//   Delete setting
router.delete(
  '/:id',
  authenticate,
  settingsController.deleteSetting
);

export default router;
