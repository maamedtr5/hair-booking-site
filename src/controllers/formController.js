// controllers/formController.js

import { prisma } from '../lib/prisma.js';
import formModel from '../models/form.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
export const createForm = async (req, res) => {
  try {
    const form = await formModel.createForm(req.body);
    return sendSuccess(res, form, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const getForm = async (req, res) => {
  try {
    const form = await formModel.getFormById(parseInt(req.params.id));
    if (!form) return sendError(res, 'Form not found', 404);
    return sendSuccess(res, form);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all forms (with skip/take pagination)
export const getForms = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const forms = await prisma.form.findMany({
      skip,
      take,
      include: {
        client: true,
        booking: true,
      },
    });

    return sendSuccess(res, forms);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const updateForm = async (req, res) => {
  try {
    const form = await formModel.updateForm(parseInt(req.params.id), req.body);
    return sendSuccess(res, form);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const deleteForm = async (req, res) => {
  try {
    await formModel.deleteForm(parseInt(req.params.id));
    return sendSuccess(res, null, 200, 'Form deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};
