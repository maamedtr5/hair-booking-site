// src/utils/salonLocation.js

import { prisma } from '../lib/prisma.js';
import { DEFAULT_SALON_LOCATION, validateSalonLocationShape } from './salonLocationCore.js';

export const SALON_LOCATION_KEY = 'salon_location';

export { DEFAULT_SALON_LOCATION, validateSalonLocationShape } from './salonLocationCore.js';

export async function getSalonLocationConfig() {
  const row = await prisma.settings.findUnique({ where: { key: SALON_LOCATION_KEY } });
  if (!row?.value) return DEFAULT_SALON_LOCATION;
  const err = validateSalonLocationShape(row.value);
  if (err) return DEFAULT_SALON_LOCATION;
  return row.value;
}

export async function setSalonLocationConfig(location) {
  const err = validateSalonLocationShape(location);
  if (err) throw new Error(err);
  return prisma.settings.upsert({
    where: { key: SALON_LOCATION_KEY },
    update: { value: location },
    create: { key: SALON_LOCATION_KEY, value: location, description: 'Salon address, map coordinates, and getting-here notes' },
  });
}
