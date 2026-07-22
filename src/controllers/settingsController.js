// controllers/settingsController.js
import { prisma } from '../lib/prisma.js';
import settingsModel from '../models/settings.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createSetting = async (req, res) => {
  try {
    const setting = await settingsModel.createSetting(req.body);
    return sendSuccess(res, setting, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await settingsModel.getSettingById(parseInt(req.params.id));
    if (!setting) return sendError(res, 'Setting not found', 404);
    return sendSuccess(res, setting);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getSettingByKey = async (req, res) => {
  try {
    const setting = await settingsModel.getSettingByKey(req.params.key);
    if (!setting) return sendError(res, 'Setting not found', 404);
    return sendSuccess(res, setting);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

//   Get all settings (with skip/take pagination)
export const getSettings = async (req, res) => {
  try {
    // Parse query params, default to skip=0, take=10
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 10;

    const settings = await prisma.setting.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, settings);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateSetting = async (req, res) => {
  try {
    const setting = await settingsModel.updateSetting(parseInt(req.params.id), req.body);
    return sendSuccess(res, setting);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const deleteSetting = async (req, res) => {
  try {
    await settingsModel.deleteSetting(parseInt(req.params.id));
    return sendSuccess(res, null, 200, 'Setting deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};