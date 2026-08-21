// controllers/promocodeController.js
import { prisma } from '../lib/prisma.js';
import promocodeModel from '../models/promocode.js';
import { sendSuccess, sendError } from '../utils/response.js';

import { safeErrorMessage } from '../utils/errorMessages.js';
export const createPromocode = async (req, res) => {
  try {
    const promocode = await promocodeModel.createPromocode(req.body);
    return sendSuccess(res, promocode, 201);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const getPromocode = async (req, res) => {
  try {
    const promocode = await promocodeModel.getPromocodeById(parseInt(req.params.id));
    if (!promocode) return sendError(res, 'Promocode not found', 404);
    return sendSuccess(res, promocode);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const getPromocodeByCode = async (req, res) => {
  try {
    const promocode = await promocodeModel.getPromocodeByCode(req.params.code);
    if (!promocode) return sendError(res, 'Promocode not found', 404);
    return sendSuccess(res, promocode);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

//   Get all promo codes (with skip/take pagination)
export const getPromocodes = async (req, res) => {
  try {
    // Parse query params; default to a high cap since the admin promo
    // codes page has no pagination UI and expects the full list.
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 500;

    const promocodes = await prisma.promocode.findMany({
      skip,
      take,
      orderBy: { id: 'desc' }, // newest first — Promocode has no createdAt column
    });

    return sendSuccess(res, promocodes);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const updatePromocode = async (req, res) => {
  try {
    const promocode = await promocodeModel.updatePromocode(parseInt(req.params.id), req.body);
    return sendSuccess(res, promocode);
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};

export const deletePromocode = async (req, res) => {
  try {
    await promocodeModel.deletePromocode(parseInt(req.params.id));
    return sendSuccess(res, null, 200, 'Promocode deleted successfully');
  } catch (err) {
    return sendError(res, safeErrorMessage(err), 400);
  }
};
