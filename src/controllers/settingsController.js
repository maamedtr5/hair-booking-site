// controllers/settingsController.js
import settingsModel from '../models/settings.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  DEFAULT_BUSINESS_HOURS,
  getBusinessHoursConfig,
  setBusinessHoursConfig,
} from '../utils/businessHours.js';
import {
  DEFAULT_PAYMENT_POLICY,
  getPaymentPolicyConfig,
  setPaymentPolicyConfig,
} from '../utils/paymentPolicy.js';
import {
  DEFAULT_SALON_LOCATION,
  getSalonLocationConfig,
  setSalonLocationConfig,
} from '../utils/salonLocation.js';
import {
  DEFAULT_BUSINESS_INFO,
  getBusinessInfoConfig,
  setBusinessInfoConfig,
} from '../utils/businessInfo.js';

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

// Get all settings. Was calling prisma.setting (singular) directly, which
// doesn't exist on the client — the model is `Settings` (plural), so this
// threw on every request. Also dropped the orderBy: it referenced a
// createdAt field the Settings model doesn't have (only updatedAt).
export const getSettings = async (req, res) => {
  try {
    const settings = await settingsModel.getAllSettings();
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

// ── Business hours — dedicated, friendlier endpoints on top of the
// generic Settings key-value store, so the frontend doesn't need to know
// about the underlying key/value shape. ──────────────────────────────────

export const getBusinessHours = async (req, res) => {
  try {
    const config = await getBusinessHoursConfig();
    return sendSuccess(res, config);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateBusinessHours = async (req, res) => {
  try {
    await setBusinessHoursConfig(req.body);
    return sendSuccess(res, req.body, 200, 'Business hours updated');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getBusinessHoursDefaults = async (_req, res) => {
  return sendSuccess(res, DEFAULT_BUSINESS_HOURS);
};

// ── Payment policy — deposit-at-booking configuration ─────────────────

export const getPaymentPolicy = async (req, res) => {
  try {
    const policy = await getPaymentPolicyConfig();
    return sendSuccess(res, policy);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updatePaymentPolicy = async (req, res) => {
  try {
    await setPaymentPolicyConfig(req.body);
    return sendSuccess(res, req.body, 200, 'Payment policy updated');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getPaymentPolicyDefaults = async (_req, res) => {
  return sendSuccess(res, DEFAULT_PAYMENT_POLICY);
};

// ── Salon location — address, map coordinates, and admin-authored
// getting-here notes (e.g. which trotro routes to take or avoid) shown
// on the public site's "Getting Here" section. ──────────────────────────

export const getSalonLocation = async (req, res) => {
  try {
    const location = await getSalonLocationConfig();
    return sendSuccess(res, location);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateSalonLocation = async (req, res) => {
  try {
    await setSalonLocationConfig(req.body);
    return sendSuccess(res, req.body, 200, 'Location updated');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getSalonLocationDefaults = async (_req, res) => {
  return sendSuccess(res, DEFAULT_SALON_LOCATION);
};

// ── Business info — name, phone, email shown to clients (and, for name,
// used as the "From" display name on outgoing emails). ─────────────────

export const getBusinessInfo = async (req, res) => {
  try {
    const info = await getBusinessInfoConfig();
    return sendSuccess(res, info);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const updateBusinessInfo = async (req, res) => {
  try {
    await setBusinessInfoConfig(req.body);
    return sendSuccess(res, req.body, 200, 'Business info updated');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getBusinessInfoDefaults = async (_req, res) => {
  return sendSuccess(res, DEFAULT_BUSINESS_INFO);
};
