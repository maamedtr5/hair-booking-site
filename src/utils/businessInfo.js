// src/utils/businessInfo.js

import { prisma } from '../lib/prisma.js';
import { DEFAULT_BUSINESS_INFO, validateBusinessInfoShape } from './businessInfoCore.js';

export const BUSINESS_INFO_KEY = 'business_info';

export { DEFAULT_BUSINESS_INFO, validateBusinessInfoShape } from './businessInfoCore.js';

export async function getBusinessInfoConfig() {
  const row = await prisma.settings.findUnique({ where: { key: BUSINESS_INFO_KEY } });
  if (!row?.value) return DEFAULT_BUSINESS_INFO;
  const err = validateBusinessInfoShape(row.value);
  if (err) return DEFAULT_BUSINESS_INFO;
  return row.value;
}

export async function setBusinessInfoConfig(info) {
  const err = validateBusinessInfoShape(info);
  if (err) throw new Error(err);
  return prisma.settings.upsert({
    where: { key: BUSINESS_INFO_KEY },
    update: { value: info },
    create: { key: BUSINESS_INFO_KEY, value: info, description: 'Business name, phone, and email shown to clients' },
  });
}
