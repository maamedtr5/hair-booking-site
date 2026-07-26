// src/utils/businessHoursCore.js


export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DEFAULT_BUSINESS_HOURS = {
  sunday:    { open: false, start: '09:00', end: '18:00' },
  monday:    { open: true,  start: '09:00', end: '18:00' },
  tuesday:   { open: true,  start: '09:00', end: '18:00' },
  wednesday: { open: true,  start: '09:00', end: '18:00' },
  thursday:  { open: true,  start: '09:00', end: '18:00' },
  friday:    { open: true,  start: '09:00', end: '18:00' },
  saturday:  { open: true,  start: '09:00', end: '18:00' },
};

function isValidTime(str) {
  return typeof str === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(str);
}

/** Validates a full 7-day config shape before it's allowed to be saved. */
export function validateBusinessHoursShape(config) {
  if (!config || typeof config !== 'object') return 'Business hours must be an object';
  for (const day of DAY_NAMES) {
    const entry = config[day];
    if (!entry || typeof entry !== 'object') return `Missing config for ${day}`;
    if (typeof entry.open !== 'boolean') return `${day}.open must be true/false`;
    if (entry.open) {
      if (!isValidTime(entry.start) || !isValidTime(entry.end)) {
        return `${day} start/end must be HH:MM (24hr)`;
      }
      if (entry.start >= entry.end) {
        return `${day} start time must be before end time`;
      }
    }
  }
  return null; // valid
}

/** Minutes-from-midnight bounds for a given JS day-of-week (0=Sun..6=Sat), or null if closed. */
export function getDayBounds(dayOfWeek, config) {
  const entry = config[DAY_NAMES[dayOfWeek]];
  if (!entry || !entry.open) return null;
  const [startH, startM] = entry.start.split(':').map(Number);
  const [endH, endM] = entry.end.split(':').map(Number);
  return { startMinutes: startH * 60 + startM, endMinutes: endH * 60 + endM };
}

/** Is this Date within the configured open hours for its day? */
export function isWithinBusinessHours(date, config) {
  const bounds = getDayBounds(date.getDay(), config);
  if (!bounds) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= bounds.startMinutes && minutes < bounds.endMinutes;
}
