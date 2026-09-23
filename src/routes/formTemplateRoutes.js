// src/routes/formTemplateRoutes.js
import express from 'express';
import {
  getFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  addFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields,
} from '../controllers/formTemplateController.js';
import { authenticate } from '../auth/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  validateTemplateCreate,
  validateTemplateUpdate,
  validateTemplateIdParam,
  validateFieldCreate,
  validateFieldUpdate,
  validateFieldIdParams,
  validateReorder,
} from '../validators/formTemplateValidator.js';

const router = express.Router();

// The form builder is an admin-only surface end to end — clients never
// call this router directly. Their read access to a template's fields
// comes through ServiceCategory's nested `formTemplate` (see
// serviceCategoryController.getCategories), which only ever exposes
// active templates on active categories.
router.use(authenticate, requireRole('admin'));

router.get('/', getFormTemplates);
router.get('/:id', validateTemplateIdParam, getFormTemplate);
router.post('/', validateTemplateCreate, createFormTemplate);
router.put('/:id', validateTemplateUpdate, updateFormTemplate);
router.delete('/:id', validateTemplateIdParam, deleteFormTemplate);

router.post('/:id/fields', validateFieldCreate, addFormField);
router.put('/:id/fields/reorder', validateReorder, reorderFormFields);
router.put('/:id/fields/:fieldId', validateFieldUpdate, updateFormField);
router.delete('/:id/fields/:fieldId', validateFieldIdParams, deleteFormField);

export default router;
