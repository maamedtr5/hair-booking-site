// src/routes/formRoutes.js
import express from 'express';
import * as formController from '../controllers/formController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateFormCreate, validateFormUpdate } from '../validators/formValidator.js';

const router = express.Router();

// POST /forms
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateFormCreate,
  formController.createForm
);

// GET routes
router.get('/:id', formController.getForm);
router.get('/', formController.getForms);

// PUT /forms/:id
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateFormUpdate,
  formController.updateForm
);

// DELETE /forms/:id
router.delete('/:id', authenticate, requireRole('admin'), formController.deleteForm);

export default router;
