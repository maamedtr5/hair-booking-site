// controllers/formTemplateController.js
import { prisma } from '../lib/prisma.js';
import formTemplateModel from '../models/formTemplate.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { safeErrorMessage } from '../utils/errorMessages.js';

// Admin only (route-level) — the builder's own listing.
export const getFormTemplates = async (req, res) => {
  try {
    const templates = await formTemplateModel.getAllTemplates();
    return sendSuccess(res, templates);
  } catch (error) {
    console.error('Error fetching form templates:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const getFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await formTemplateModel.getTemplateById(id);
    if (!template) return sendError(res, 'Form template not found', 404);
    return sendSuccess(res, template);
  } catch (error) {
    console.error('Error fetching form template:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const createFormTemplate = async (req, res) => {
  try {
    const template = await formTemplateModel.createTemplate(req.body);
    return sendSuccess(res, template, 201);
  } catch (error) {
    console.error('Error creating form template:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const updateFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await formTemplateModel.updateTemplate(id, req.body);
    return sendSuccess(res, template);
  } catch (error) {
    console.error('Error updating form template:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level). The FK from ServiceCategory/Form is ON DELETE
// SET NULL, so deleting a template in use just clears its assignment
// rather than silently deleting the category or someone's submitted
// consultation answers.
export const deleteFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await formTemplateModel.deleteTemplate(id);
    return sendSuccess(res, null, 200, 'Form template deleted successfully');
  } catch (error) {
    console.error('Error deleting form template:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const addFormField = async (req, res) => {
  try {
    const formTemplateId = parseInt(req.params.id, 10);
    const template = await prisma.formTemplate.findUnique({ where: { id: formTemplateId } });
    if (!template) return sendError(res, 'Form template not found', 404);

    const field = await formTemplateModel.addField(formTemplateId, req.body);
    return sendSuccess(res, field, 201);
  } catch (error) {
    console.error('Error adding form field:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const updateFormField = async (req, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId, 10);
    const existing = await formTemplateModel.getFieldById(fieldId);
    if (!existing || existing.formTemplateId !== parseInt(req.params.id, 10)) {
      return sendError(res, 'Form field not found', 404);
    }
    const field = await formTemplateModel.updateField(fieldId, req.body);
    return sendSuccess(res, field);
  } catch (error) {
    console.error('Error updating form field:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level).
export const deleteFormField = async (req, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId, 10);
    const existing = await formTemplateModel.getFieldById(fieldId);
    if (!existing || existing.formTemplateId !== parseInt(req.params.id, 10)) {
      return sendError(res, 'Form field not found', 404);
    }
    await formTemplateModel.deleteField(fieldId);
    return sendSuccess(res, null, 200, 'Form field deleted successfully');
  } catch (error) {
    console.error('Error deleting form field:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};

// Admin only (route-level). Body: { fieldIds: number[] } — every field
// currently on the template must be listed exactly once, so a stale
// client (someone editing the builder in two tabs) can never silently
// drop a question out of the visible order.
export const reorderFormFields = async (req, res) => {
  try {
    const formTemplateId = parseInt(req.params.id, 10);
    const { fieldIds } = req.body;

    const existingFields = await prisma.formField.findMany({
      where: { formTemplateId },
      select: { id: true },
    });
    const existingIds = new Set(existingFields.map((f) => f.id));
    const requestedIds = Array.isArray(fieldIds) ? fieldIds.map((id) => parseInt(id, 10)) : [];

    const sameSet =
      requestedIds.length === existingIds.size &&
      requestedIds.every((id) => existingIds.has(id)) &&
      new Set(requestedIds).size === requestedIds.length;

    if (!sameSet) {
      return sendError(res, 'The field list must include every field on this form exactly once.', 400);
    }

    const fields = await formTemplateModel.reorderFields(formTemplateId, requestedIds);
    return sendSuccess(res, fields);
  } catch (error) {
    console.error('Error reordering form fields:', error);
    return sendError(res, safeErrorMessage(error), 400);
  }
};
