// controllers/settingsController.js
import { prisma } from '../lib/prisma.js';
import settingsModel from '../models/settings.js';

export const createSetting = async (req, res) => {
  try {
    const setting = await settingsModel.createSetting(req.body);
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await settingsModel.getSettingById(parseInt(req.params.id));
    if (!setting) return res.status(404).json({ error: "Setting not found" });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getSettingByKey = async (req, res) => {
  try {
    const setting = await settingsModel.getSettingByKey(req.params.key);
    if (!setting) return res.status(404).json({ error: "Setting not found" });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


export const updateSetting = async (req, res) => {
  try {
    const setting = await settingsModel.updateSetting(parseInt(req.params.id), req.body);
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteSetting = async (req, res) => {
  try {
    await settingsModel.deleteSetting(parseInt(req.params.id));
    res.json({ message: "Setting deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};