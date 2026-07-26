// src/utils/businessHours.js


import { prisma } from '../lib/prisma.js';
import { DEFAULT_BUSINESS_HOURS, validateBusinessHoursShape } from './businessHoursCore.js';

export const BUSINESS_HOURS_KEY = 'business_hours';

export { DAY_NAMES, DEFAULT_BUSINESS_HOURS, validateBusinessHoursShape, getDayBounds, isWithinBusinessHours } from './businessHoursCore.js';

/** Reads the configured business hours, or the default schedule if unset. */
export async function getBusinessHoursConfig() {
  const row = await prisma.settings.findUnique({ where: { key: BUSINESS_HOURS_KEY } });
  if (!row?.value) return DEFAULT_BUSINESS_HOURS;
  const err = validateBusinessHoursShape(row.value);
  if (err) return DEFAULT_BUSINESS_HOURS; // corrupt/partial config — fail safe to defaults
  return row.value;
}

/** Admin-only write. Validates before saving so a bad shape can never be stored. */
export async function setBusinessHoursConfig(config) {
  const err = validateBusinessHoursShape(config);
  if (err) throw new Error(err);
  return prisma.settings.upsert({
    where: { key: BUSINESS_HOURS_KEY },
    update: { value: config },
    create: { key: BUSINESS_HOURS_KEY, value: config, description: 'Weekly opening days & hours' },
  });
}
