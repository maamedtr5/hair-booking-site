 // models/settings.js
import { prisma } from '../lib/prisma.js';



async function createSetting(data) {
  return prisma.settings.create({ data });
}

async function getSettingById(id) {
  return prisma.settings.findUnique({ where: { id } });
}

async function getSettingByKey(key) {
  return prisma.settings.findUnique({ where: { key } });
}

async function getAllSettings() {
  return prisma.settings.findMany();
}

async function updateSetting(id, data) {
  return prisma.settings.update({
    where: { id },
    data
  });
}

async function deleteSetting(id) {
  return prisma.settings.delete({ where: { id } });
}

  export default {
  createSetting,
  getSettingById,
  getSettingByKey,
  getAllSettings,
  updateSetting,
  deleteSetting
};